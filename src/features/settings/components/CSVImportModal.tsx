import { useState } from 'react'
import { Dialog } from 'primereact/dialog'
import { Timestamp, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../firebase/config'
import { assetService } from '../../assets/services/assetService'
import { ASSET_STATUS_OPTIONS, type Asset, type AssetFormData, type AssetStatus } from '../../assets/types/asset.types'
import type { Category } from '../../categories/types/category.types'
import { parseCSVDate, parseCSVNumber } from '../utils/csv'

interface CSVImportModalProps {
  data: { headers: string[]; rows: string[][] } | null
  categories: Category[]
  assets: Asset[]
  schoolAName: string
  schoolBName: string
  onClose: () => void
  onImported: () => void
}

type AssetField =
  | 'name' | 'brand' | 'model' | 'category' | 'subcategoryId' | 'school' | 'status'
  | 'serialNumber' | 'assetTag' | 'purchaseDate' | 'purchasePrice' | 'estimatedValue'
  | 'lifespanYears' | 'warrantyExpiry' | 'assignedTo' | 'location' | 'notes'

const FIELD_DEFS: { key: AssetField; label: string; required?: boolean; aliases: string[] }[] = [
  { key: 'name',           label: 'Asset Name',      required: true, aliases: ['name', 'asset name', 'item name', 'asset id'] },
  { key: 'brand',          label: 'Brand',           aliases: ['brand', 'manufacturer', 'make'] },
  { key: 'model',          label: 'Model',           aliases: ['model'] },
  { key: 'category',       label: 'Category',        aliases: ['category', 'type', 'asset type'] },
  { key: 'subcategoryId',  label: 'Subcategory',     aliases: ['subcategory', 'sub category', 'sub-category'] },
  { key: 'school',         label: 'School / Site',   aliases: ['school', 'site', 'campus', 'location site', 'current building', 'building'] },
  { key: 'status',         label: 'Status',          aliases: ['status', 'condition'] },
  { key: 'serialNumber',   label: 'Serial Number',   aliases: ['serial number', 'serial #', 'serial', 's/n', 'sn'] },
  { key: 'assetTag',       label: 'Asset Tag',       aliases: ['unique identifier', 'asset tag', 'tag', 'tag id'] },
  { key: 'purchaseDate',   label: 'Purchase Date',   aliases: ['purchase date', 'date purchased', 'purchased'] },
  { key: 'purchasePrice',  label: 'Purchase Price',  aliases: ['purchase price', 'price', 'cost'] },
  { key: 'estimatedValue', label: 'Estimated Value', aliases: ['estimated value', 'current value', 'book value'] },
  { key: 'lifespanYears',  label: 'Lifespan (years)',aliases: ['lifespan', 'life span', 'lifespan years', 'useful life'] },
  { key: 'warrantyExpiry', label: 'Warranty Expiry', aliases: ['warranty expiration date', 'warranty expiry', 'warranty', 'warranty date'] },
  { key: 'assignedTo',     label: 'Assigned To',     aliases: ['assigned to', 'current employee', 'current student', 'owner', 'assignee', 'user'] },
  { key: 'location',       label: 'Location / Room', aliases: ['current room', 'location', 'room'] },
  { key: 'notes',          label: 'Notes',           aliases: ['notes', 'comment', 'comments', 'remarks'] },
]

const SKIP = '__skip__'

/**
 * Exact alias match first; falls back to substring containment for headers that don't
 * match an alias verbatim (e.g. "Serial Number:" or a vendor-specific export label).
 * Each header can only be claimed once, first field in FIELD_DEFS order wins.
 */
const guessMapping = (headers: string[]): Record<AssetField, string> => {
  const norm = (s: string) => s.trim().toLowerCase()
  const normHeaders = headers.map(h => ({ raw: h, norm: norm(h) }))
  const used = new Set<string>()
  const result = {} as Record<AssetField, string>

  for (const def of FIELD_DEFS) {
    let match = normHeaders.find(h => !used.has(h.raw) && def.aliases.includes(h.norm))
    if (!match) {
      match = normHeaders.find(h => !used.has(h.raw) && def.aliases.some(a => h.norm.includes(a)))
    }
    if (match) used.add(match.raw)
    result[def.key] = match?.raw ?? SKIP
  }
  return result
}

const normalizeStatus = (v: string): AssetStatus => {
  const norm = v.trim().toLowerCase()
  const found = ASSET_STATUS_OPTIONS.find(o => o.value === norm || o.label.toLowerCase() === norm)
  return found?.value ?? 'active'
}

const inputSt: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--surface-section)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '7px 10px', color: 'var(--text-color)',
  fontFamily: 'inherit', fontSize: 13, outline: 'none', cursor: 'pointer',
}

const CSVImportModal = ({ data, categories, assets, schoolAName, schoolBName, onClose, onImported }: CSVImportModalProps) => {
  const [mapping, setMapping] = useState<Record<AssetField, string> | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  const headers = data?.headers ?? []
  const rows = data?.rows ?? []

  const activeMapping = mapping ?? (headers.length ? guessMapping(headers) : null)

  const setField = (field: AssetField, header: string) =>
    setMapping({ ...(activeMapping as Record<AssetField, string>), [field]: header })

  const valueFor = (row: string[], field: AssetField): string => {
    const header = activeMapping?.[field]
    if (!header || header === SKIP) return ''
    const idx = headers.indexOf(header)
    return idx === -1 ? '' : (row[idx] ?? '')
  }

  const matchSchool = (text: string): string => {
    const norm = text.trim().toLowerCase()
    if (norm === schoolAName.trim().toLowerCase() || norm === 'a' || norm === 'school a' || norm === 'es' || norm.startsWith('elementary')) return 'school_a'
    if (norm === schoolBName.trim().toLowerCase() || norm === 'b' || norm === 'school b' || norm === 'ms' || norm.startsWith('middle')) return 'school_b'
    return 'school_a'
  }

  const handleClose = () => { setMapping(null); onClose() }

  const handleImport = async () => {
    if (!activeMapping || activeMapping.name === SKIP) {
      alert('Please map the "Asset Name" field before importing.')
      return
    }
    setImporting(true)
    setProgress({ done: 0, total: rows.length })

    let success = 0
    let duplicatesSkipped = 0
    const createdCategories = new Set<string>()
    const byName = new Map(categories.map(c => [c.name.trim().toLowerCase(), c.id]))
    const seenAssetTags = new Set(assets.map(a => a.assetTag.trim()).filter(Boolean))

    const resolveCategoryId = async (text: string): Promise<string> => {
      const key = text.trim().toLowerCase()
      if (!key) return ''
      const existing = byName.get(key)
      if (existing) return existing
      const ref = await addDoc(collection(db, 'categories'), {
        name: text.trim(), icon: 'pi pi-box', colorKey: 'blue',
        subcategories: [], careTasks: [], isDeleted: false,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      })
      byName.set(key, ref.id)
      createdCategories.add(text.trim())
      return ref.id
    }

    for (const row of rows) {
      const name = valueFor(row, 'name').trim()
      if (!name) { setProgress(p => ({ ...p, done: p.done + 1 })); continue }

      const assetTag = valueFor(row, 'assetTag').trim()
      if (assetTag && seenAssetTags.has(assetTag)) {
        duplicatesSkipped++
        setProgress(p => ({ ...p, done: p.done + 1 }))
        continue
      }

      const categoryId = await resolveCategoryId(valueFor(row, 'category'))

      const purchaseDate = parseCSVDate(valueFor(row, 'purchaseDate')) ?? new Date()
      const warrantyDate = parseCSVDate(valueFor(row, 'warrantyExpiry'))

      const asset: AssetFormData = {
        name,
        brand:          valueFor(row, 'brand'),
        model:          valueFor(row, 'model'),
        categoryId,
        subcategoryId:  valueFor(row, 'subcategoryId'),
        school:         matchSchool(valueFor(row, 'school')),
        status:         normalizeStatus(valueFor(row, 'status') || 'active'),
        serialNumber:   valueFor(row, 'serialNumber'),
        assetTag,
        purchaseDate:   Timestamp.fromDate(purchaseDate),
        purchasePrice:  parseCSVNumber(valueFor(row, 'purchasePrice')),
        estimatedValue: parseCSVNumber(valueFor(row, 'estimatedValue')),
        lifespanYears:  parseCSVNumber(valueFor(row, 'lifespanYears')) || 3,
        warrantyExpiry: warrantyDate ? Timestamp.fromDate(warrantyDate) : null,
        assignedTo:     valueFor(row, 'assignedTo'),
        location:       valueFor(row, 'location'),
        notes:          valueFor(row, 'notes'),
      }

      const ok = await assetService.create(asset)
      if (ok) { success++; if (assetTag) seenAssetTags.add(assetTag) }
      setProgress(p => ({ ...p, done: p.done + 1 }))
    }

    setImporting(false)
    const skipped = rows.length - success - duplicatesSkipped
    const dupNote = duplicatesSkipped > 0
      ? `\n\n${duplicatesSkipped} row${duplicatesSkipped === 1 ? '' : 's'} skipped as duplicates (Asset Tag already exists).`
      : ''
    const catNote = createdCategories.size > 0
      ? `\n\n${createdCategories.size} new categor${createdCategories.size === 1 ? 'y was' : 'ies were'} created: ${[...createdCategories].join(', ')}`
      : ''
    alert(`Import complete: ${success} of ${rows.length} assets imported.${skipped > 0 ? ` ${skipped} skipped (missing name or write error).` : ''}${dupNote}${catNote}`)
    handleClose()
    onImported()
  }

  return (
    <Dialog
      visible={!!data}
      onHide={() => { if (!importing) handleClose() }}
      closable={!importing}
      closeOnEscape={!importing}
      blockScroll
      draggable={false}
      resizable={false}
      style={{ width: '640px' }}
      header={
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-color)' }}>📥 Import Assets from CSV</div>
          <div style={{ fontSize: 12, color: 'var(--text-color-secondary)', marginTop: 3 }}>
            {rows.length} row{rows.length === 1 ? '' : 's'} detected — map your columns to TechTrack fields
          </div>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button" onClick={handleClose} disabled={importing}
            style={{
              padding: '8px 18px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-color-secondary)', fontFamily: 'inherit', fontSize: 13,
              cursor: importing ? 'not-allowed' : 'pointer', opacity: importing ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="button" onClick={handleImport} disabled={importing || rows.length === 0}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', cursor: importing ? 'not-allowed' : 'pointer',
              background: 'var(--primary-color)', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
              opacity: importing ? 0.7 : 1,
            }}
          >
            {importing ? `Importing ${progress.done}/${progress.total}…` : `Import ${rows.length} Asset${rows.length === 1 ? '' : 's'}`}
          </button>
        </div>
      }
    >
      <p style={{ fontSize: 13, color: 'var(--text-color-secondary)', margin: '0 0 16px' }}>
        Match each TechTrack field to a column from your file. Categories that don't already exist will be created automatically. Rows whose Asset Tag matches an asset already in TechTrack are skipped to avoid duplicates. Fields left as "Skip" will be left blank.
      </p>
      <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
        {FIELD_DEFS.map(def => (
          <div key={def.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 150, flexShrink: 0, fontSize: 13, color: 'var(--text-color)' }}>
              {def.label}{def.required && <span style={{ color: '#ef4444' }}> *</span>}
            </div>
            <select
              value={activeMapping?.[def.key] ?? SKIP}
              onChange={e => setField(def.key, e.target.value)}
              disabled={importing}
              style={{ ...inputSt, flex: 1, opacity: importing ? 0.5 : 1, cursor: importing ? 'not-allowed' : 'pointer' }}
            >
              <option value={SKIP} style={{ background: 'var(--surface-card)' }}>— Skip —</option>
              {headers.map(h => (
                <option key={h} value={h} style={{ background: 'var(--surface-card)' }}>{h}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </Dialog>
  )
}

export default CSVImportModal
