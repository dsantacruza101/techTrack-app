import { useRef, useState, useEffect } from 'react'
import { Timestamp } from 'firebase/firestore'
import { createPortal } from 'react-dom'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useSchool } from '../../../contexts/SchoolContext'
import { useTopbarTitle } from '../../../contexts/TopbarContext'
import { useSettings } from '../../settings/hooks/useSettings'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { Toast } from 'primereact/toast'
import { Tag } from 'primereact/tag'
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog'
import { assetService } from '../services/assetService'
import { useAssetMutations } from '../hooks/useAssetMutations'
import { usePermissions } from '../../auth/hooks/usePermissions'
import { useWorkOrders } from '../../workOrders/hooks/useWorkOrders'
import { categoryService } from '../../categories/services/categoryService'
import AssetForm from '../components/AssetForm'
import LifespanBar from '../components/LifespanBar'
import MetricsRow from '../components/MetricsRow'
import AlertStrip from '../components/AlertStrip'
import SchoolBanner from '../components/SchoolBanner'
import AssetDetailPanel from '../components/AssetDetailPanel'
import {
  getLifespanStatus,
  getLifespanPercent,
  LIFESPAN_STATUS_LABEL,
  LIFESPAN_STATUS_SEVERITY,
} from '../types/asset.types'
import type { Asset, AssetFormData, AssetStatus } from '../types/asset.types'
import type { Category } from '../../categories/types/category.types'
import { CATEGORY_COLORS } from '../../categories/types/category.types'
import type { ColorKey } from '../../categories/types/category.types'

// ── Care helpers ──────────────────────────────────────────────────────
const FREQ_DAYS: Record<string, number> = {
  daily: 1, weekly: 7, monthly: 30, quarterly: 91, annually: 365, asneeded: 0,
}

const getNextCareDue = (asset: Asset, cat: Category | undefined): Date | null => {
  if (!cat?.careTasks?.length) return null
  let earliest: Date | null = null
  for (const task of cat.careTasks) {
    const days = FREQ_DAYS[task.freq] ?? 0
    if (!days) continue
    const lastDone = asset.careCompletions?.[task.id]
    const nextDue = lastDone
      ? new Date(lastDone.toDate().getTime() + days * 86400000)
      : asset.purchaseDate.toDate()
    if (!earliest || nextDue < earliest) earliest = nextDue
  }
  return earliest
}

type StatusFilter = 'all' | AssetStatus

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All',         value: 'all'         },
  { label: 'Active',      value: 'active'      },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Storage',     value: 'storage'     },
  { label: 'Retired',     value: 'retired'     },
]

const AssetsPage = () => {
  const toast = useRef<Toast>(null)
  const navigate                      = useNavigate()
  const [assets, setAssets]           = useState<Asset[]>([])
  const [categories, setCategories]   = useState<Category[]>([])
  const [loading, setLoading]         = useState(true)
  const [dialogOpen, setDialogOpen]   = useState(false)
  const [selected, setSelected]       = useState<Asset | undefined>()
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [detailAssetId, setDetailAssetId] = useState<string | undefined>()
  const detailAsset = detailAssetId ? assets.find(a => a.id === detailAssetId) : undefined
  const [addTab, setAddTab]           = useState<'manual' | 'csv' | 'copy'>('manual')
  const [bulkImporting, setBulkImporting] = useState(false)
  const [csvParsing, setCsvParsing]       = useState(false)
  const [bulkPreviewRows, setBulkPreviewRows] = useState<{ name:string; category:string; subcategoryId:string; model:string; serialNumber:string; status:string; assignedTo:string; location:string; purchaseDate:string; lifespanYears:number; warrantyExpiry:string; estimatedValue:number; notes:string; categoryId:string }[]>([])
  const [showBulkPreview, setShowBulkPreview] = useState(false)
  const [headersCopied, setHeadersCopied]     = useState(false)
  const [copySourceId, setCopySourceId]   = useState<string>('')
  const [copySearch, setCopySearch]       = useState('')
  const [searchParams]                = useSearchParams()
  const { school, setSchool }         = useSchool()
  const { settings }                  = useSettings()

  const { saving, deleting, replicating, create, update, softDelete, restore, replicate } =
    useAssetMutations()
  const { can }          = usePermissions()
  useWorkOrders()
  const { setTitle, clearTitle } = useTopbarTitle()

  useEffect(() => {
    const unsubAssets = assetService.subscribeToAll((data) => { setAssets(data); setLoading(false) })
    const unsubCats   = categoryService.subscribeToActive((data) => setCategories(data))
    return () => { unsubAssets(); unsubCats() }
  }, [])

  // Reset local status filter when URL param changes
  useEffect(() => { setStatusFilter('all') }, [searchParams])

  // Open "Add Asset" dialog when ?add=true is in URL
  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setSelected(undefined)
      setDialogOpen(true)
      navigate('/assets', { replace: true })
    }
  }, [searchParams, navigate])

  const filterCategory = searchParams.get('category')
  const filterStatus   = searchParams.get('status')   // 'replace' from sidebar

  const visibleAssets = assets.filter((a) => {
    if (a.isDeleted) return false
    if (filterCategory && a.categoryId !== filterCategory) return false
    if (filterStatus === 'replace' && getLifespanStatus(a.purchaseDate, a.lifespanYears) !== 'replace') return false
    if (statusFilter !== 'all' && a.status !== statusFilter) return false
    if (school !== 'all' && a.school !== school) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        a.name.toLowerCase().includes(q)         ||
        a.brand.toLowerCase().includes(q)        ||
        a.model.toLowerCase().includes(q)        ||
        a.serialNumber.toLowerCase().includes(q) ||
        a.assetTag.toLowerCase().includes(q)     ||
        a.assignedTo.toLowerCase().includes(q)
      )
    }
    return true
  })

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]))

  const notify = (severity: 'success' | 'error', summary: string, detail: string) =>
    toast.current?.show({ severity, summary, detail, life: 3000 })

  const openCreate = () => { setSelected(undefined); setAddTab('manual'); setCopySourceId(''); setCopySearch(''); setShowBulkPreview(false); setBulkPreviewRows([]); setDialogOpen(true) }
  const switchAddTab = (tab: 'manual' | 'csv' | 'copy') => { setAddTab(tab); setShowBulkPreview(false); setBulkPreviewRows([]) }
  const openEdit   = (a: Asset) => { setSelected(a); setDialogOpen(true) }

  const handleSave = async (data: AssetFormData) => {
    const ok = selected ? await update(selected.id, data) : await create(data)
    if (ok) { notify('success', 'Success', selected ? 'Asset updated.' : 'Asset added.'); setDialogOpen(false) }
    else     { notify('error', 'Error', 'Something went wrong. Please try again.') }
  }

  const handleDelete = (a: Asset) =>
    confirmDialog({
      message: `Archive "${a.name}"? It can be restored later.`,
      header: 'Archive Asset',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'tt-confirm-danger',
      accept: async () => {
        const ok = await softDelete(a.id)
        notify(ok ? 'success' : 'error', ok ? 'Archived' : 'Error',
          ok ? `"${a.name}" has been archived.` : 'Something went wrong.')
      },
    })

  const handleRestore = async (a: Asset) => {
    const ok = await restore(a.id)
    notify(ok ? 'success' : 'error', ok ? 'Restored' : 'Error',
      ok ? `"${a.name}" has been restored.` : 'Something went wrong.')
  }

  const handleReplicate = async (a: Asset) => {
    const ok = await replicate(a)
    notify(ok ? 'success' : 'error', ok ? 'Replicated' : 'Error',
      ok ? `"${a.name}" has been duplicated.` : 'Something went wrong.')
  }

  const CSV_TEMPLATE_HEADERS = 'Name,Category,Subcategory,Model,Serial,Status,Assigned,Location,Purchase Date,Lifespan (yrs),Warranty Exp.,Est. Value,Notes'

  // ── CSV File Import ────────────────────────────────────────────────────────
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
        else inQ = !inQ
      } else if (ch === ',' && !inQ) { result.push(cur); cur = '' }
      else cur += ch
    }
    result.push(cur)
    return result
  }

  const handleCSVFile = (file: File) => {
    setCsvParsing(true)
    const reader = new FileReader()
    reader.onload = e => {
      const text = (e.target?.result as string) ?? ''
      const lines = text.trim().split(/\r?\n/)
      if (lines.length < 2) { notify('error', 'Empty', 'CSV has no data rows.'); return }
      const headers = parseCSVLine(lines[0]).map(h => h.trim())
      // Map header names to indices (flexible — matches export format)
      const idx = (name: string) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase())
      const iName = idx('Name'), iCat = idx('Category'), iSub = idx('Subcategory')
      const iModel = idx('Model'), iSerial = idx('Serial'), iStatus = idx('Status')
      const iAssigned = idx('Assigned'), iLoc = idx('Location')
      const iDate = idx('Purchase Date'), iLife = idx('Lifespan (yrs)')
      const iWarranty = idx('Warranty Exp.'), iVal = idx('Est. Value'), iNotes = idx('Notes')

      const rows = lines.slice(1).map(line => {
        const cols = parseCSVLine(line)
        const get = (i: number) => (i >= 0 ? (cols[i] ?? '').trim() : '')
        const rawCat = get(iCat)
        const cat = categories.find(c => c.name.toLowerCase() === rawCat.toLowerCase())
        return {
          name:          get(iName),
          category:      rawCat,
          subcategoryId: get(iSub),
          model:         get(iModel),
          serialNumber:  get(iSerial),
          status:        get(iStatus) || 'active',
          assignedTo:    get(iAssigned),
          location:      get(iLoc),
          purchaseDate:  get(iDate) || new Date().toISOString().slice(0, 10),
          lifespanYears: parseInt(get(iLife)) || 5,
          warrantyExpiry: get(iWarranty) || '',
          estimatedValue: parseFloat(get(iVal)) || 0,
          notes:         get(iNotes),
          categoryId:    cat?.id ?? '',
        }
      }).filter(r => r.name)

      if (!rows.length) { notify('error', 'Empty', 'No valid rows found in CSV.'); setCsvParsing(false); return }
      setBulkPreviewRows(rows)
      setShowBulkPreview(true)
      setCsvParsing(false)
    }
    reader.readAsText(file)
  }

  const handleBulkImport = async () => {
    const rows = bulkPreviewRows
    if (!rows.length) { notify('error', 'Empty', 'No valid rows found.'); return }
    setBulkImporting(true)
    let success = 0
    for (const row of rows) {
      const data: AssetFormData = {
        name: row.name, brand: '', model: row.model,
        categoryId: row.categoryId, subcategoryId: row.subcategoryId,
        school: 'school_a', status: row.status as AssetStatus,
        serialNumber: row.serialNumber, assetTag: '',
        purchaseDate: Timestamp.fromDate(new Date(row.purchaseDate + 'T00:00:00')),
        purchasePrice: row.estimatedValue, estimatedValue: row.estimatedValue,
        lifespanYears: row.lifespanYears,
        warrantyExpiry: row.warrantyExpiry ? Timestamp.fromDate(new Date(row.warrantyExpiry + 'T00:00:00')) : null,
        assignedTo: row.assignedTo, location: row.location, notes: row.notes,
      }
      const ok = await create(data)
      if (ok) success++
    }
    setBulkImporting(false)
    notify('success', 'Imported', `${success} of ${rows.length} assets imported.`)
    if (success > 0) { setShowBulkPreview(false); setDialogOpen(false) }
  }

  const handleCopyAndEdit = () => {
    const src = assets.find(a => a.id === copySourceId)
    if (!src) return
    const { id: _id, isDeleted: _del, createdAt: _ca, updatedAt: _ua, careCompletions: _cc } = src
    setSelected({ ...src, name: src.name + ' (Copy)' } as Asset)
    setAddTab('manual')
  }

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const isoDate = (ts: { toDate(): Date }) => ts.toDate().toISOString().slice(0, 10)
    const escape  = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const replaceBy = (a: Asset) => {
      const d = new Date(a.purchaseDate.toDate())
      d.setFullYear(d.getFullYear() + a.lifespanYears)
      return d.toISOString().slice(0, 10)
    }

    const headers = ['ID', 'Name', 'Category', 'Subcategory', 'Model', 'Serial', 'Status',
                     'Assigned', 'Location', 'Purchase Date', 'Lifespan (yrs)',
                     'Warranty Exp.', 'Est. Value', 'Replace By', 'Notes']

    const rows = visibleAssets.map((a) => [
      escape(`FT-${a.id.substring(0, 8).toUpperCase()}`),
      escape(a.name),
      escape(categoryMap[a.categoryId]?.name ?? ''),
      escape(a.subcategoryId ?? ''),
      escape(a.model),
      escape(a.serialNumber),
      escape(a.status),
      escape(a.assignedTo),
      escape(a.location),
      escape(isoDate(a.purchaseDate)),
      escape(a.lifespanYears),
      escape(a.warrantyExpiry ? isoDate(a.warrantyExpiry) : ''),
      escape(a.estimatedValue ?? a.purchasePrice),
      escape(replaceBy(a)),
      escape(a.notes),
    ])

    const csv     = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob    = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url     = URL.createObjectURL(blob)
    const link    = document.createElement('a')
    link.href     = url
    link.download = `techtrack-assets-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // ── Column templates ───────────────────────────────────────────────────────
  const nameTemplate = (row: Asset) => {
    const cat   = categoryMap[row.categoryId]
    const color = cat ? (CATEGORY_COLORS[cat.colorKey as ColorKey] ?? CATEGORY_COLORS.blue) : CATEGORY_COLORS.blue
    return (
      <div className="flex align-items-center gap-3">
        <div
          className="flex align-items-center justify-content-center border-round-lg flex-shrink-0"
          style={{ width: 36, height: 36, background: color.bg, color: color.text, fontSize: 16 }}
        >
          <i className={cat?.icon ?? 'pi pi-box'} />
        </div>
        <div>
          <div className="font-medium text-sm">{row.name}</div>
          {(row.brand || row.model) && (
            <div className="font-mono text-xs mt-1" style={{ opacity: 0.5 }}>
              {[row.brand, row.model].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      </div>
    )
  }

  const STATUS_DOT: Record<AssetStatus, { dot: string; text: string; label: string }> = {
    active:      { dot: '#22c55e', text: '#4ade80', label: 'Active'      },
    maintenance: { dot: '#f59e0b', text: '#fbbf24', label: 'Maintenance' },
    storage:     { dot: '#94a3b8', text: '#94a3b8', label: 'Storage'     },
    retired:     { dot: '#ef4444', text: '#f87171', label: 'Retired'     },
  }

  const statusTemplate = (row: Asset) => {
    const s = STATUS_DOT[row.status] ?? STATUS_DOT.active
    return (
      <div className="flex align-items-center gap-2" style={{ whiteSpace: 'nowrap' }}>
        <div className="border-round-full flex-shrink-0" style={{ width: 7, height: 7, background: s.dot, boxShadow: `0 0 6px ${s.dot}` }} />
        <span className="font-mono text-xs font-semibold" style={{ color: s.text }}>{s.label}</span>
      </div>
    )
  }

  const categoryTemplate = (row: Asset) => {
    const cat = categoryMap[row.categoryId]
    return cat
      ? <span className="text-sm">{cat.name}</span>
      : <span className="text-sm" style={{ opacity: 0.4 }}>—</span>
  }

  const replaceByTemplate = (row: Asset) => {
    const replaceDate = new Date(row.purchaseDate.toDate())
    replaceDate.setFullYear(replaceDate.getFullYear() + row.lifespanYears)
    return (
      <span className="text-sm font-mono">
        {replaceDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
      </span>
    )
  }

  const lifespanTemplate = (row: Asset) => {
    const status = getLifespanStatus(row.purchaseDate, row.lifespanYears)
    return (
      <div className="flex flex-column gap-1" style={{ minWidth: 120 }}>
        <LifespanBar purchaseDate={row.purchaseDate} lifespanYears={row.lifespanYears} />
        <Tag
          value={LIFESPAN_STATUS_LABEL[status]}
          severity={LIFESPAN_STATUS_SEVERITY[status]}
          rounded
          style={{ fontSize: 10, padding: '2px 8px', width: 'fit-content' }}
        />
      </div>
    )
  }

  const actionsTemplate = (row: Asset) => (
    <div className="flex gap-1 justify-content-end">
      {!row.isDeleted && (
        <>
          {can('edit_asset') && (
            <Button icon="pi pi-pencil" size="small" severity="secondary" text rounded tooltip="Edit" tooltipOptions={{ position: 'top' }} onClick={() => openEdit(row)} />
          )}
          {can('replicate_asset') && (
            <Button icon="pi pi-copy" size="small" severity="secondary" text rounded tooltip="Duplicate" tooltipOptions={{ position: 'top' }} loading={replicating} onClick={() => handleReplicate(row)} />
          )}
          {can('delete_asset') && (
            <Button icon="pi pi-inbox" size="small" severity="danger" text rounded tooltip="Archive" tooltipOptions={{ position: 'top' }} loading={deleting} onClick={() => handleDelete(row)} />
          )}
        </>
      )}
      {row.isDeleted && can('delete_asset') && (
        <Button icon="pi pi-replay" size="small" severity="success" text rounded tooltip="Restore" tooltipOptions={{ position: 'top' }} loading={saving} onClick={() => handleRestore(row)} />
      )}
    </div>
  )

  const nextCareTemplate = (row: Asset) => {
    const cat = categoryMap[row.categoryId]
    const due = getNextCareDue(row, cat)
    if (!due) return <span style={{ opacity: 0.3 }}>—</span>
    const now = Date.now()
    const msLeft = due.getTime() - now
    const isOverdue = msLeft < 0
    const isSoon    = !isOverdue && msLeft < 30 * 86400000
    const color     = isOverdue ? '#ef4444' : isSoon ? '#f59e0b' : '#22c55e'
    return (
      <span className="text-xs font-mono" style={{ color, whiteSpace: 'nowrap' }}>
        {isOverdue ? '⚠ Overdue' : due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </span>
    )
  }

  const schoolTemplate = (row: Asset) => {
    const isA = row.school === 'school_a'
    return (
      <span style={{
        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, fontFamily: 'DM Mono, monospace',
        background: isA ? 'rgba(79,143,255,0.15)' : 'rgba(124,58,237,0.15)',
        color: isA ? '#4f8fff' : '#a78bfa',
      }}>
        {isA ? (settings.schoolAName?.slice(0, 1) || 'A') : (settings.schoolBName?.slice(0, 1) || 'B')}
      </span>
    )
  }

  const getPageTitle = () => {
    if (filterCategory) { const cat = categoryMap[filterCategory]; return cat ? cat.name : 'Assets' }
    if (filterStatus === 'replace') return 'Needs Replacing'
    return 'All Assets'
  }

  // ── Topbar title ────────────────────────────────────────────────
  useEffect(() => {
    setTitle(getPageTitle())
    return clearTitle
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory, filterStatus, categories])

  const showStatusChips = !filterStatus

  // ── Topbar portal actions ────────────────────────────────────────
  const topbarSlot = typeof document !== 'undefined' ? document.getElementById('tt-topbar-actions') : null

  const topbarActions = (
    <div className="flex align-items-center gap-2">
      {/* Search */}
      <div className="p-icon-field p-icon-field-left tt-search-field">
        <i className="pi pi-search p-input-icon" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search assets..."
          style={{ width: '100%', background: 'var(--tt-bg-input)', border: '1px solid var(--tt-border)', borderRadius: 8, padding: '8px 10px 8px 2.25rem', color: 'var(--text-color)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }}
        />
      </div>
      {/* Export */}
      {can('export_csv') && (
        <Button
          icon="pi pi-download"
          label="Export"
          className="tt-toolbar-btn hidden md:flex"
          disabled={visibleAssets.length === 0}
          onClick={handleExportCSV}
        />
      )}
      {/* Print */}
      <Button
        icon="pi pi-print"
        label="Print"
        className="tt-toolbar-btn hidden md:flex"
        onClick={() => window.print()}
      />
      {/* Add Asset */}
      {can('add_asset') && (
        <Button
          icon="pi pi-plus"
          label="Add Asset"
          className="tt-toolbar-btn tt-toolbar-btn-primary hidden md:flex"
          onClick={openCreate}
        />
      )}
    </div>
  )

  const mobileToolbar = (
    <div className="md:hidden flex flex-column gap-2">
      <div className="p-icon-field p-icon-field-left w-full">
        <i className="pi pi-search p-input-icon" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search assets..."
          style={{ width: '100%', background: 'var(--tt-bg-input)', border: '1px solid var(--tt-border)', borderRadius: 8, padding: '8px 10px 8px 2.25rem', color: 'var(--text-color)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }}
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        {can('add_asset') && (
          <Button icon="pi pi-plus" label="Add Asset" className="tt-toolbar-btn tt-toolbar-btn-primary flex-1" onClick={openCreate} />
        )}
        {can('export_csv') && (
          <Button
            icon="pi pi-download"
            label="Export"
            className="tt-toolbar-btn flex-1"
            disabled={visibleAssets.length === 0}
            onClick={handleExportCSV}
          />
        )}
        <Button
          icon="pi pi-print"
          label="Print"
          className="tt-toolbar-btn flex-1"
          onClick={() => window.print()}
        />
      </div>
    </div>
  )

  return (
    <div className="flex flex-column gap-4">
      <Toast ref={toast} position="top-right" />
      <ConfirmDialog />

      {/* ── Topbar actions portal ────────────────────────────────────── */}
      {topbarSlot && createPortal(topbarActions, topbarSlot)}

      {mobileToolbar}

      {/* ── School banner ────────────────────────────────────────────── */}
      <SchoolBanner
        school={school}
        schoolName={settings.schoolAName || 'School A'}
        schoolBName={settings.schoolBName || 'School B'}
        assets={assets.filter(a => !a.isDeleted)}
        categories={categories}
        onSwitchSchool={setSchool}
      />

      {/* ── Alert strip ─────────────────────────────────────────────── */}
      <AlertStrip assets={assets} />

      {/* ── Metrics ─────────────────────────────────────────────────── */}
      {!filterCategory && !filterStatus && (
        <MetricsRow assets={visibleAssets} />
      )}

      {/* ── Status filter chips ──────────────────────────────────────── */}
      {showStatusChips && (
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className="border-round-3xl px-3 py-1 cursor-pointer font-mono text-xs border-1"
              style={{
                background:   statusFilter === f.value ? 'var(--primary-color)'  : 'transparent',
                color:        statusFilter === f.value ? '#fff'                  : 'var(--text-color-secondary)',
                borderColor:  statusFilter === f.value ? 'var(--primary-color)'  : 'var(--surface-border)',
                transition:   'all 0.15s',
                fontFamily:   'inherit',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div style={{ borderRadius: 12, overflow: 'hidden' }}>
        <div className="tt-table-scroll">
        <DataTable
          value={[...visibleAssets].sort((a, b) => getLifespanPercent(b.purchaseDate, b.lifespanYears) - getLifespanPercent(a.purchaseDate, a.lifespanYears))}
          loading={loading}
          emptyMessage="No assets found."
          rowClassName={(row: Asset) => row.isDeleted ? 'tt-row-disabled' : ''}
          onRowClick={e => setDetailAssetId((e.data as Asset).id)}
          stripedRows
          showGridlines={false}
          style={{ cursor: 'pointer', minWidth: '1360px' }}
        >
          <Column header="Asset"       body={nameTemplate}      style={{ minWidth: 240 }} />
          <Column header="Status"      body={statusTemplate}    style={{ minWidth: 120 }} />
          <Column header="School"      body={schoolTemplate}    style={{ minWidth: 70 }}  />
          <Column header="Category"    body={categoryTemplate}  style={{ minWidth: 120 }} />
          <Column field="assignedTo"   header="Assigned To"     style={{ minWidth: 140 }} body={(row: Asset) => row.assignedTo ? <span className="text-sm">{row.assignedTo}</span> : <span className="text-sm" style={{ opacity: 0.4 }}>—</span>} />
          <Column field="location"     header="Location"        style={{ minWidth: 130 }} body={(row: Asset) => row.location ? <span className="text-sm">{row.location}</span> : <span className="text-sm" style={{ opacity: 0.4 }}>—</span>} />
          <Column header="Lifespan"    body={lifespanTemplate}  style={{ minWidth: 160 }} />
          <Column header="Next Care"   body={nextCareTemplate}  style={{ minWidth: 110 }} />
          <Column header="Replace By"  body={replaceByTemplate} style={{ minWidth: 140 }} />
          <Column header=""            body={actionsTemplate}   style={{ width: 130 }} align="right" />
        </DataTable>
        </div>
      </div>

      {/* ── Detail panel ────────────────────────────────────────────── */}
      <AssetDetailPanel
        asset={detailAsset ?? null}
        categories={categories}
        visible={!!detailAsset}
        onHide={() => setDetailAssetId(undefined)}
        onEdit={openEdit}
        onDuplicate={a => { handleReplicate(a); setDetailAssetId(undefined) }}
        onDelete={a => { handleDelete(a); setDetailAssetId(undefined) }}
      />

      {/* ── Dialog ──────────────────────────────────────────────────── */}
      <Dialog
        visible={dialogOpen}
        onHide={() => setDialogOpen(false)}
        header={selected ? 'Edit Asset' : 'Add New Asset'}
        style={{ width: 'min(680px, calc(100vw - 24px))' }}
        modal
        blockScroll
        draggable={false}
        resizable={false}
      >
        {/* Tab bar — only shown when adding */}
        {!selected && (
          <div className="flex gap-2 mb-4">
            {([
              { id: 'manual', label: '+ Single'        },
              { id: 'csv',    label: '📂 Import CSV'   },
              { id: 'copy',   label: '📋 Copy Existing'},
            ] as const).map(t => (
              <button
                key={t.id}
                onClick={() => switchAddTab(t.id)}
                style={{
                  padding: '6px 15px', fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', borderRadius: 8, transition: 'all 0.15s',
                  background:   addTab === t.id ? 'var(--primary-color)'           : 'transparent',
                  color:        addTab === t.id ? '#fff'                            : 'var(--tt-text-secondary)',
                  border:       addTab === t.id ? '1px solid var(--primary-color)' : '1px solid var(--tt-border)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Manual entry (default / edit mode) */}
        {(selected || addTab === 'manual') && (
          <AssetForm
            initial={selected}
            categories={categories}
            schoolAName={settings.schoolAName || 'School A'}
            schoolBName={settings.schoolBName || 'School B'}
            saving={saving}
            onSave={handleSave}
            onCancel={() => setDialogOpen(false)}
          />
        )}



        {/* CSV Import tab */}
        {!selected && addTab === 'csv' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!showBulkPreview ? (
              <>
                <div style={{ fontSize: 13, color: 'var(--text-color-secondary)', lineHeight: 1.6 }}>
                  Upload a CSV exported from TechTrack, or create your own using the template headers below.
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(CSV_TEMPLATE_HEADERS).then(() => { setHeadersCopied(true); setTimeout(() => setHeadersCopied(false), 2500) })}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'var(--tt-surface-section)', border: '1px solid var(--tt-border)', color: 'var(--text-color)', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}
                  >
                    📋 Copy Template Headers
                  </button>
                  {headersCopied && <span style={{ fontSize: 13, color: '#22c55e' }}>✅ Copied!</span>}
                </div>
                <label
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 10, padding: '32px 20px', borderRadius: 12,
                    border: `2px dashed ${csvParsing ? 'rgba(79,143,255,0.5)' : 'var(--tt-border)'}`,
                    background: 'var(--tt-bg-input)',
                    cursor: csvParsing ? 'not-allowed' : 'pointer', transition: 'border-color 0.15s',
                  }}
                  onDragOver={e => { e.preventDefault(); if (!csvParsing) e.currentTarget.style.borderColor = 'rgba(79,143,255,0.5)' }}
                  onDragLeave={e => { if (!csvParsing) e.currentTarget.style.borderColor = 'var(--tt-border)' }}
                  onDrop={e => {
                    e.preventDefault()
                    e.currentTarget.style.borderColor = 'var(--tt-border)'
                    const file = e.dataTransfer.files[0]
                    if (file && !csvParsing) handleCSVFile(file)
                  }}
                >
                  {csvParsing ? (
                    <>
                      <i className="pi pi-spin pi-spinner" style={{ fontSize: 28, color: 'var(--primary-color)' }} />
                      <span style={{ fontSize: 14, color: 'var(--text-color-secondary)' }}>Reading file…</span>
                    </>
                  ) : (
                    <>
                      <i className="pi pi-upload" style={{ fontSize: 28, color: 'var(--text-color-secondary)' }} />
                      <span style={{ fontSize: 14, color: 'var(--text-color-secondary)' }}>
                        Drag & drop a CSV file here, or <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>click to browse</span>
                      </span>
                    </>
                  )}
                  <input
                    type="file" accept=".csv" style={{ display: 'none' }}
                    disabled={csvParsing}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleCSVFile(f) }}
                  />
                </label>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                  <button type="button" onClick={() => setDialogOpen(false)} style={{ padding: '8px 18px', borderRadius: 8, background: 'transparent', border: '1px solid var(--tt-border)', color: 'var(--text-color-secondary)', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, color: 'var(--text-color-secondary)' }}>
                  <strong style={{ color: 'var(--text-color)' }}>{bulkPreviewRows.length} row{bulkPreviewRows.length !== 1 ? 's' : ''}</strong> ready to import. Review below.
                </div>
                <div style={{ position: 'relative', overflowX: 'auto', maxHeight: 300, border: '1px solid var(--tt-border)', borderRadius: 9 }}>
                  {bulkImporting && (
                    <div style={{
                      position: 'absolute', inset: 0, zIndex: 10, borderRadius: 9,
                      background: 'rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 10,
                    }}>
                      <i className="pi pi-spin pi-spinner" style={{ fontSize: 28, color: '#fff' }} />
                      <span style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>Importing assets…</span>
                    </div>
                  )}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>
                    <thead>
                      <tr style={{ background: 'var(--tt-surface-section)', position: 'sticky', top: 0 }}>
                        {['Name','Category','Subcategory','Model','Serial','Status','Assigned','Location'].map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--tt-text-muted)', fontWeight: 600, letterSpacing: '1px', whiteSpace: 'nowrap', borderBottom: '1px solid var(--tt-border)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPreviewRows.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--tt-border-faint)' }}>
                          <td style={{ padding: '7px 10px', color: 'var(--text-color)', whiteSpace: 'nowrap' }}>{r.name}</td>
                          <td style={{ padding: '7px 10px', color: r.categoryId ? 'var(--text-color)' : '#ef4444', whiteSpace: 'nowrap' }}>{r.category || '—'}</td>
                          <td style={{ padding: '7px 10px', color: 'var(--text-color-secondary)', whiteSpace: 'nowrap' }}>{r.subcategoryId || '—'}</td>
                          <td style={{ padding: '7px 10px', color: 'var(--text-color-secondary)', whiteSpace: 'nowrap' }}>{r.model || '—'}</td>
                          <td style={{ padding: '7px 10px', color: 'var(--text-color-secondary)', whiteSpace: 'nowrap' }}>{r.serialNumber || '—'}</td>
                          <td style={{ padding: '7px 10px', color: 'var(--text-color-secondary)', whiteSpace: 'nowrap' }}>{r.status}</td>
                          <td style={{ padding: '7px 10px', color: 'var(--text-color-secondary)', whiteSpace: 'nowrap' }}>{r.assignedTo || '—'}</td>
                          <td style={{ padding: '7px 10px', color: 'var(--text-color-secondary)', whiteSpace: 'nowrap' }}>{r.location || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {bulkPreviewRows.some(r => !r.categoryId) && (
                  <div style={{ fontSize: 12, color: '#f59e0b' }}>⚠ Some categories weren't matched (shown in red). They'll be saved without a category — you can edit them after import.</div>
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                  <button type="button" onClick={() => setShowBulkPreview(false)} style={{ padding: '8px 18px', borderRadius: 8, background: 'transparent', border: '1px solid var(--tt-border)', color: 'var(--text-color-secondary)', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>
                    ← Back
                  </button>
                  <button type="button" onClick={handleBulkImport} disabled={bulkImporting} style={{ padding: '8px 18px', borderRadius: 8, background: 'var(--primary-color)', border: 'none', color: '#fff', fontFamily: 'inherit', fontSize: 13, cursor: bulkImporting ? 'not-allowed' : 'pointer', opacity: bulkImporting ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {bulkImporting ? 'Importing…' : `↑ Import ${bulkPreviewRows.length}`}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Copy Existing tab */}
        {!selected && addTab === 'copy' && (() => {
          const copyFiltered = assets
            .filter(a => !a.isDeleted)
            .filter(a => {
              if (!copySearch.trim()) return true
              const q = copySearch.toLowerCase()
              const cat = categoryMap[a.categoryId]
              return (
                a.name.toLowerCase().includes(q) ||
                a.brand.toLowerCase().includes(q) ||
                a.model.toLowerCase().includes(q) ||
                (cat?.name ?? '').toLowerCase().includes(q)
              )
            })
            .sort((a, b) => a.name.localeCompare(b.name))
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--text-color-secondary)' }}>
                Select an existing asset to use as a template — all fields will be pre-filled.
              </div>
              {/* Search */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)' }}>Search</label>
                <input
                  style={{ width: '100%', background: 'var(--surface-section)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 9, padding: '10px 13px', color: 'var(--text-color)', fontFamily: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }}
                  placeholder="Filter assets…"
                  value={copySearch}
                  onChange={e => setCopySearch(e.target.value)}
                  autoFocus
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(79,143,255,0.5)')}
                  onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
                />
              </div>
              {/* Asset list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                {copyFiltered.map(a => {
                  const cat   = categoryMap[a.categoryId]
                  const color = cat ? (CATEGORY_COLORS[cat.colorKey as ColorKey] ?? CATEGORY_COLORS.blue) : CATEGORY_COLORS.blue
                  const isSelected = copySourceId === a.id
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setCopySourceId(a.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px', borderRadius: 10, textAlign: 'left',
                        background: isSelected ? 'rgba(79,143,255,0.12)' : 'var(--surface-section)',
                        border: isSelected ? '1px solid rgba(79,143,255,0.5)' : '1px solid rgba(255,255,255,0.07)',
                        cursor: 'pointer', transition: 'border-color 0.15s',
                        width: '100%',
                      }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: color.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={cat?.icon ?? 'pi pi-box'} style={{ fontSize: 14, color: color.text }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {[cat?.name, a.brand, a.model].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    </button>
                  )
                })}
                {copyFiltered.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>No assets found</div>
                )}
              </div>
              {/* Footer */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  style={{ padding: '8px 18px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCopyAndEdit}
                  disabled={!copySourceId}
                  style={{ padding: '8px 18px', borderRadius: 8, background: 'var(--primary-color)', border: 'none', color: '#fff', fontFamily: 'inherit', fontSize: 13, cursor: copySourceId ? 'pointer' : 'not-allowed', opacity: copySourceId ? 1 : 0.4, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  Copy &amp; Edit →
                </button>
              </div>
            </div>
          )
        })()}
      </Dialog>
    </div>
  )
}

export default AssetsPage
