import { useState, useEffect } from 'react'
import { InputText } from 'primereact/inputtext'
import { InputNumber } from 'primereact/inputnumber'
import { Dropdown } from 'primereact/dropdown'
import { Calendar } from 'primereact/calendar'
import { InputTextarea } from 'primereact/inputtextarea'
import { Button } from 'primereact/button'
import { Timestamp } from 'firebase/firestore'
import type { Category } from '../../categories/types/category.types'
import type { Asset, AssetFormData } from '../types/asset.types'
import { ASSET_STATUS_OPTIONS } from '../types/asset.types'

interface AssetFormProps {
  initial?: Asset
  categories: Category[]
  saving: boolean
  onSave: (data: AssetFormData) => void
  onCancel: () => void
}

const DEFAULT: AssetFormData = {
  name:          '',
  brand:         '',
  model:         '',
  categoryId:    '',
  status:        'active',
  serialNumber:  '',
  assetTag:      '',
  purchaseDate:  Timestamp.fromDate(new Date()),
  purchasePrice: 0,
  lifespanYears: 3,
  assignedTo:    '',
  notes:         '',
}

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label
    className="font-mono text-xs"
    style={{ letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-color-secondary)' }}
  >
    {children}
  </label>
)

const AssetForm = ({ initial, categories, saving, onSave, onCancel }: AssetFormProps) => {
  const [form, setForm] = useState<AssetFormData>(DEFAULT)

  useEffect(() => {
    setForm(initial ? {
      name:          initial.name,
      brand:         initial.brand,
      model:         initial.model,
      categoryId:    initial.categoryId,
      status:        initial.status ?? 'active',
      serialNumber:  initial.serialNumber,
      assetTag:      initial.assetTag,
      purchaseDate:  initial.purchaseDate,
      purchasePrice: initial.purchasePrice,
      lifespanYears: initial.lifespanYears,
      assignedTo:    initial.assignedTo,
      notes:         initial.notes,
    } : DEFAULT)
  }, [initial])

  const set = <K extends keyof AssetFormData>(key: K, val: AssetFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.categoryId) return
    onSave(form)
  }

  const categoryOptions = categories.map((c) => ({ label: c.name, value: c.id }))

  return (
    <form onSubmit={handleSubmit} className="flex flex-column gap-4">

      <div className="flex flex-column gap-2">
        <FieldLabel>Asset Name *</FieldLabel>
        <InputText value={form.name} onChange={(e) => set('name', e.target.value)} placeholder='e.g. MacBook Pro 14"' className="w-full" required autoFocus />
      </div>

      <div className="grid">
        <div className="col-6 flex flex-column gap-2">
          <FieldLabel>Brand</FieldLabel>
          <InputText value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Apple" className="w-full" />
        </div>
        <div className="col-6 flex flex-column gap-2">
          <FieldLabel>Model</FieldLabel>
          <InputText value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="MBP14-M3" className="w-full" />
        </div>
      </div>

      <div className="grid">
        <div className="col-6 flex flex-column gap-2">
          <FieldLabel>Category *</FieldLabel>
          <Dropdown value={form.categoryId} options={categoryOptions} onChange={(e) => set('categoryId', e.value)} placeholder="Select a category" className="w-full" />
        </div>
        <div className="col-6 flex flex-column gap-2">
          <FieldLabel>Status</FieldLabel>
          <Dropdown value={form.status} options={ASSET_STATUS_OPTIONS} onChange={(e) => set('status', e.value)} className="w-full" />
        </div>
      </div>

      <div className="grid">
        <div className="col-6 flex flex-column gap-2">
          <FieldLabel>Serial Number</FieldLabel>
          <InputText value={form.serialNumber} onChange={(e) => set('serialNumber', e.target.value)} placeholder="SN123456" className="w-full" />
        </div>
        <div className="col-6 flex flex-column gap-2">
          <FieldLabel>Asset Tag</FieldLabel>
          <InputText value={form.assetTag} onChange={(e) => set('assetTag', e.target.value)} placeholder="TT-0001" className="w-full" />
        </div>
      </div>

      <div className="grid">
        <div className="col-6 flex flex-column gap-2">
          <FieldLabel>Purchase Date</FieldLabel>
          <Calendar
            value={form.purchaseDate.toDate()}
            onChange={(e) => { if (e.value instanceof Date) set('purchaseDate', Timestamp.fromDate(e.value)) }}
            dateFormat="mm/dd/yy"
            showIcon
            className="w-full"
          />
        </div>
        <div className="col-6 flex flex-column gap-2">
          <FieldLabel>Purchase Price ($)</FieldLabel>
          <InputNumber value={form.purchasePrice} onValueChange={(e) => set('purchasePrice', e.value ?? 0)} mode="currency" currency="USD" locale="en-US" className="w-full" />
        </div>
      </div>

      <div className="flex flex-column gap-2">
        <FieldLabel>Expected Lifespan (years)</FieldLabel>
        <InputNumber value={form.lifespanYears} onValueChange={(e) => set('lifespanYears', e.value ?? 1)} min={1} max={20} showButtons className="w-full" />
      </div>

      <div className="flex flex-column gap-2">
        <FieldLabel>Assigned To</FieldLabel>
        <InputText value={form.assignedTo} onChange={(e) => set('assignedTo', e.target.value)} placeholder="Room 101 / John Doe" className="w-full" />
      </div>

      <div className="flex flex-column gap-2">
        <FieldLabel>Notes</FieldLabel>
        <InputTextarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Any additional details..." rows={3} className="w-full" autoResize />
      </div>

      <div className="flex gap-2 justify-content-end">
        <Button type="button" label="Cancel" severity="secondary" outlined onClick={onCancel} disabled={saving} />
        <Button type="submit" label={saving ? '' : initial ? 'Save Changes' : 'Add Asset'} icon={saving ? 'pi pi-spin pi-spinner' : undefined} disabled={saving || !form.name.trim() || !form.categoryId} />
      </div>

    </form>
  )
}

export default AssetForm
