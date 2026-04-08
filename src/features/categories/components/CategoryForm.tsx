import { useState, useEffect } from 'react'
import { InputText } from 'primereact/inputtext'
import { Button } from 'primereact/button'
import IconSelector from './IconSelector'
import ColorSelector from './ColorSelector'
import { CATEGORY_COLORS } from '../types/category.types'
import type { Category, CategoryFormData, ColorKey } from '../types/category.types'

interface CategoryFormProps {
  initial?: Category
  saving: boolean
  onSave: (data: CategoryFormData) => void
  onCancel: () => void
}

const DEFAULT: CategoryFormData = { name: '', icon: 'pi pi-box', colorKey: 'blue', subcategories: [], careTasks: [] }

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label
    className="font-mono text-xs"
    style={{ letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-color-secondary)' }}
  >
    {children}
  </label>
)

const getColor = (key: string) => CATEGORY_COLORS[key as ColorKey] ?? CATEGORY_COLORS.blue

const CategoryForm = ({ initial, saving, onSave, onCancel }: CategoryFormProps) => {
  const [form, setForm] = useState<CategoryFormData>(DEFAULT)

  useEffect(() => {
    setForm(initial ? { name: initial.name, icon: initial.icon, colorKey: initial.colorKey, subcategories: initial.subcategories ?? [], careTasks: initial.careTasks ?? [] } : DEFAULT)
  }, [initial])

  const set = <K extends keyof CategoryFormData>(key: K, val: CategoryFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }))

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSave(form)
  }

  const color = getColor(form.colorKey)

  return (
    <form onSubmit={handleSubmit} className="flex flex-column gap-4">

      <div className="flex flex-column gap-2">
        <FieldLabel>Category Name</FieldLabel>
        <InputText value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. MacBooks" className="w-full" required autoFocus />
      </div>

      <div className="flex flex-column gap-2">
        <FieldLabel>Icon</FieldLabel>
        <IconSelector value={form.icon} onChange={(v) => set('icon', v)} />
      </div>

      <div className="flex flex-column gap-2">
        <FieldLabel>Color</FieldLabel>
        <ColorSelector value={form.colorKey as ColorKey} onChange={(v) => set('colorKey', v)} />
      </div>

      {/* Preview */}
      <div className="flex flex-column gap-2">
        <FieldLabel>Preview</FieldLabel>
        <div
          className="flex align-items-center gap-3 border-round-lg p-3"
          style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-hover)' }}
        >
          <div
            className="flex align-items-center justify-content-center border-round-lg flex-shrink-0"
            style={{ width: 36, height: 36, background: color.bg, color: color.text, fontSize: 18 }}
          >
            <i className={form.icon} />
          </div>
          <span className="text-sm" style={{ color: 'var(--text-color)' }}>
            {form.name || 'Category Name'}
          </span>
        </div>
      </div>

      <div className="flex gap-2 justify-content-end">
        <Button type="button" label="Cancel" severity="secondary" outlined onClick={onCancel} disabled={saving} />
        <Button type="submit" label={saving ? '' : initial ? 'Save Changes' : 'Create Category'} icon={saving ? 'pi pi-spin pi-spinner' : undefined} disabled={saving || !form.name.trim()} />
      </div>

    </form>
  )
}

export default CategoryForm
