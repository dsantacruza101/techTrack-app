import { useState, useEffect } from 'react'
import { Timestamp } from 'firebase/firestore'
import type { Category } from '../../categories/types/category.types'
import type { Asset, AssetFormData } from '../types/asset.types'
import { ASSET_STATUS_OPTIONS } from '../types/asset.types'

interface AssetFormProps {
  initial?: Asset
  categories: Category[]
  schoolAName?: string
  schoolBName?: string
  saving: boolean
  onSave: (data: AssetFormData) => void
  onCancel: () => void
}

const DEFAULT: AssetFormData = {
  name:           '',
  brand:          '',
  model:          '',
  categoryId:     '',
  subcategoryId:  '',
  school:         'school_a',
  status:         'active',
  serialNumber:   '',
  assetTag:       '',
  purchaseDate:   Timestamp.fromDate(new Date()),
  purchasePrice:  0,
  estimatedValue: 0,
  lifespanYears:  5,
  warrantyExpiry: null,
  assignedTo:     '',
  location:       '',
  notes:          '',
}

// ── Shared input styles ──────────────────────────────────────────────────────
const S = {
  label: {
    display: 'block',
    fontFamily: 'DM Mono, monospace',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
    color: 'var(--tt-text-muted)',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    background: 'var(--tt-bg-input)',
    border: '1px solid var(--tt-border)',
    borderRadius: 9,
    padding: '10px 13px',
    color: 'var(--text-color)',
    fontFamily: 'inherit',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
  },
  select: {
    width: '100%',
    background: 'var(--tt-bg-input)',
    border: '1px solid var(--tt-border)',
    borderRadius: 9,
    padding: '10px 13px',
    color: 'var(--text-color)',
    fontFamily: 'inherit',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box' as const,
    appearance: 'auto' as const,
    cursor: 'pointer',
  },
  date: {
    width: '100%',
    background: 'var(--tt-bg-input)',
    border: '1px solid var(--tt-border)',
    borderRadius: 9,
    padding: '10px 13px',
    color: 'var(--text-color)',
    fontFamily: 'inherit',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  row: {
    display: 'grid' as const,
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  field: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
  },
}

const toDateInput = (ts: Timestamp) => {
  const d = ts.toDate()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const fromDateInput = (v: string): Timestamp | null => {
  if (!v) return null
  const d = new Date(v + 'T00:00:00')
  return isNaN(d.getTime()) ? null : Timestamp.fromDate(d)
}

const AssetForm = ({ initial, categories, schoolAName = 'School A', schoolBName = 'School B', saving, onSave, onCancel }: AssetFormProps) => {
  const [form, setForm] = useState<AssetFormData>(DEFAULT)

  useEffect(() => {
    setForm(initial ? {
      name:           initial.name,
      brand:          initial.brand,
      model:          initial.model,
      categoryId:     initial.categoryId,
      subcategoryId:  initial.subcategoryId  ?? '',
      school:         initial.school         ?? 'school_a',
      status:         initial.status         ?? 'active',
      serialNumber:   initial.serialNumber,
      assetTag:       initial.assetTag,
      purchaseDate:   initial.purchaseDate,
      purchasePrice:  initial.purchasePrice,
      estimatedValue: initial.estimatedValue ?? 0,
      lifespanYears:  initial.lifespanYears,
      warrantyExpiry: initial.warrantyExpiry ?? null,
      assignedTo:     initial.assignedTo,
      location:       initial.location,
      notes:          initial.notes,
    } : DEFAULT)
  }, [initial])

  const set = <K extends keyof AssetFormData>(key: K, val: AssetFormData[K]) =>
    setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!form.name.trim() || !form.categoryId) return
    onSave(form)
  }

  const selectedCat   = categories.find(c => c.id === form.categoryId)
  const subcatOptions = [
    { label: '— None —', value: '' },
    ...(selectedCat?.subcategories ?? []).map(s => ({ label: s, value: s })),
  ]

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ASSET NAME */}
      <div style={S.field}>
        <label style={S.label}>Asset Name <span style={{ color: '#ef4444' }}>*</span></label>
        <input
          style={S.input}
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="e.g. Epson BrightLink — Room 204"
          required
          autoFocus
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(79,143,255,0.5)')}
          onBlur={e  => (e.currentTarget.style.borderColor = 'var(--tt-border)')}
        />
      </div>

      {/* SCHOOL / SITE  +  CATEGORY */}
      <div style={S.row}>
        <div style={S.field}>
          <label style={S.label}>School / Site</label>
          <select
            style={S.select}
            value={form.school}
            onChange={e => set('school', e.target.value)}
          >
            <option value="school_a">{schoolAName}</option>
            <option value="school_b">{schoolBName}</option>
          </select>
        </div>
        <div style={S.field}>
          <label style={S.label}>Category <span style={{ color: '#ef4444' }}>*</span></label>
          <select
            style={S.select}
            value={form.categoryId}
            onChange={e => { set('categoryId', e.target.value); set('subcategoryId', '') }}
            required
          >
            <option value="">Select a category</option>
            {categories.filter(c => !c.isDeleted).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* SUBCATEGORY  +  STATUS */}
      <div style={S.row}>
        <div style={S.field}>
          <label style={S.label}>Subcategory</label>
          <select
            style={S.select}
            value={form.subcategoryId}
            onChange={e => set('subcategoryId', e.target.value)}
            disabled={subcatOptions.length <= 1}
          >
            {subcatOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div style={S.field}>
          <label style={S.label}>Status</label>
          <select
            style={S.select}
            value={form.status}
            onChange={e => set('status', e.target.value as AssetFormData['status'])}
          >
            {ASSET_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* SERIAL / ASSET ID  +  MODEL / MAKE */}
      <div style={S.row}>
        <div style={S.field}>
          <label style={S.label}>Serial / Asset ID</label>
          <input
            style={S.input}
            value={form.serialNumber}
            onChange={e => set('serialNumber', e.target.value)}
            placeholder="e.g. SN123456"
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(79,143,255,0.5)')}
            onBlur={e  => (e.currentTarget.style.borderColor = 'var(--tt-border)')}
          />
        </div>
        <div style={S.field}>
          <label style={S.label}>Model / Make</label>
          <input
            style={S.input}
            value={form.model}
            onChange={e => set('model', e.target.value)}
            placeholder="e.g. Epson BrightLink 595Wi"
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(79,143,255,0.5)')}
            onBlur={e  => (e.currentTarget.style.borderColor = 'var(--tt-border)')}
          />
        </div>
      </div>

      {/* ASSIGNED TO / DEPT  +  LOCATION / ROOM */}
      <div style={S.row}>
        <div style={S.field}>
          <label style={S.label}>Assigned To / Dept</label>
          <input
            style={S.input}
            value={form.assignedTo}
            onChange={e => set('assignedTo', e.target.value)}
            placeholder="Name or department"
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(79,143,255,0.5)')}
            onBlur={e  => (e.currentTarget.style.borderColor = 'var(--tt-border)')}
          />
        </div>
        <div style={S.field}>
          <label style={S.label}>Location / Room</label>
          <input
            style={S.input}
            value={form.location}
            onChange={e => set('location', e.target.value)}
            placeholder="e.g. Boiler Room B"
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(79,143,255,0.5)')}
            onBlur={e  => (e.currentTarget.style.borderColor = 'var(--tt-border)')}
          />
        </div>
      </div>

      {/* PURCHASE DATE  +  LIFESPAN (YEARS) */}
      <div style={S.row}>
        <div style={S.field}>
          <label style={S.label}>Purchase Date</label>
          <input
            type="date"
            style={S.date}
            value={toDateInput(form.purchaseDate)}
            onChange={e => { const ts = fromDateInput(e.target.value); if (ts) set('purchaseDate', ts) }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(79,143,255,0.5)')}
            onBlur={e  => (e.currentTarget.style.borderColor = 'var(--tt-border)')}
          />
        </div>
        <div style={S.field}>
          <label style={S.label}>Lifespan (Years)</label>
          <input
            type="number"
            style={S.input}
            value={form.lifespanYears}
            onChange={e => set('lifespanYears', Math.max(1, Number(e.target.value)))}
            min={1} max={30}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(79,143,255,0.5)')}
            onBlur={e  => (e.currentTarget.style.borderColor = 'var(--tt-border)')}
          />
        </div>
      </div>

      {/* EST. VALUE ($)  +  WARRANTY EXPIRY */}
      <div style={S.row}>
        <div style={S.field}>
          <label style={S.label}>Est. Value ($)</label>
          <input
            type="number"
            style={S.input}
            value={form.estimatedValue}
            onChange={e => { const v = Number(e.target.value); set('estimatedValue', v); set('purchasePrice', v) }}
            min={0}
            placeholder="0"
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(79,143,255,0.5)')}
            onBlur={e  => (e.currentTarget.style.borderColor = 'var(--tt-border)')}
          />
        </div>
        <div style={S.field}>
          <label style={S.label}>Warranty Expiry</label>
          <input
            type="date"
            style={S.date}
            value={form.warrantyExpiry ? toDateInput(form.warrantyExpiry) : ''}
            onChange={e => set('warrantyExpiry', fromDateInput(e.target.value))}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(79,143,255,0.5)')}
            onBlur={e  => (e.currentTarget.style.borderColor = 'var(--tt-border)')}
          />
        </div>
      </div>

      {/* NOTES */}
      <div style={S.field}>
        <label style={S.label}>Notes</label>
        <textarea
          style={{ ...S.input, resize: 'vertical', minHeight: 80 }}
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Any additional notes, service history, etc."
          rows={3}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(79,143,255,0.5)')}
          onBlur={e  => (e.currentTarget.style.borderColor = 'var(--tt-border)')}
        />
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'var(--surface-section)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-color)', fontFamily: 'inherit', fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.4 : 1 }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !form.name.trim() || !form.categoryId}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'var(--primary-color)', border: '1px solid var(--primary-color)', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: saving || !form.name.trim() || !form.categoryId ? 'not-allowed' : 'pointer', opacity: saving || !form.name.trim() || !form.categoryId ? 0.4 : 1 }}
        >
          {saving ? <><i className="pi pi-spin pi-spinner" style={{ fontSize: 13 }} /> Saving…</> : initial ? 'Save Changes' : 'Save Asset'}
        </button>
      </div>

    </form>
  )
}

export default AssetForm
