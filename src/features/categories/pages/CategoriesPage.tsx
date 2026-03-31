import { useRef, useState, useEffect } from 'react'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { Toast } from 'primereact/toast'
import { Tag } from 'primereact/tag'
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog'
import { categoryService } from '../services/categoryService'
import { useCategoryMutations } from '../hooks/useCategoryMutations'
import CategoryForm from '../components/CategoryForm'
import { CATEGORY_COLORS } from '../types/category.types'
import type { Category, CategoryFormData, ColorKey } from '../types/category.types'

const CategoriesPage = () => {
  const toast = useRef<Toast>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selected, setSelected] = useState<Category | undefined>()
  const { saving, deleting, create, update, softDelete, restore } = useCategoryMutations()

  useEffect(() => {
    const unsubscribe = categoryService.subscribeToAll((data) => { setCategories(data); setLoading(false) })
    return unsubscribe
  }, [])

  const notify = (severity: 'success' | 'error', summary: string, detail: string) =>
    toast.current?.show({ severity, summary, detail, life: 3000 })

  const openCreate = () => { setSelected(undefined); setDialogOpen(true) }
  const openEdit   = (cat: Category) => { setSelected(cat); setDialogOpen(true) }

  const handleSave = async (data: CategoryFormData) => {
    const ok = selected ? await update(selected.id, data) : await create(data)
    if (ok) { notify('success', 'Success', selected ? 'Category updated.' : 'Category created.'); setDialogOpen(false) }
    else     { notify('error', 'Error', 'Something went wrong. Please try again.') }
  }

  const handleDelete = (cat: Category) =>
    confirmDialog({
      message: `Disable "${cat.name}"? Assets using it won't be affected.`,
      header: 'Disable Category',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'tt-confirm-danger',
      accept: async () => {
        const ok = await softDelete(cat.id)
        notify(ok ? 'success' : 'error', ok ? 'Disabled' : 'Error',
          ok ? `"${cat.name}" has been disabled.` : 'Something went wrong.')
      },
    })

  const handleRestore = async (cat: Category) => {
    const ok = await restore(cat.id)
    notify(ok ? 'success' : 'error', ok ? 'Restored' : 'Error',
      ok ? `"${cat.name}" has been restored.` : 'Something went wrong.')
  }

  const nameTemplate = (row: Category) => {
    const color = CATEGORY_COLORS[row.colorKey as ColorKey] ?? CATEGORY_COLORS.blue
    return (
      <div className="flex align-items-center gap-3">
        <div
          className="flex align-items-center justify-content-center border-round-lg flex-shrink-0"
          style={{ width: 34, height: 34, background: color.bg, color: color.text, fontSize: 16 }}
        >
          <i className={row.icon} />
        </div>
        <span className="font-medium text-sm">{row.name}</span>
      </div>
    )
  }

  const colorTemplate = (row: Category) => {
    const color = CATEGORY_COLORS[row.colorKey as ColorKey] ?? CATEGORY_COLORS.blue
    return (
      <div
        className="border-circle"
        style={{ width: 16, height: 16, background: color.swatch }}
        title={row.colorKey}
      />
    )
  }

  const statusTemplate = (row: Category) => (
    <Tag value={row.isDeleted ? 'Disabled' : 'Active'} severity={row.isDeleted ? 'secondary' : 'success'} rounded />
  )

  const actionsTemplate = (row: Category) => (
    <div className="flex gap-2 justify-content-end">
      {!row.isDeleted && (
        <Button icon="pi pi-pencil" size="small" severity="secondary" text rounded tooltip="Edit" tooltipOptions={{ position: 'top' }} onClick={() => openEdit(row)} />
      )}
      {row.isDeleted ? (
        <Button icon="pi pi-replay" size="small" severity="success" text rounded tooltip="Restore" tooltipOptions={{ position: 'top' }} loading={saving} onClick={() => handleRestore(row)} />
      ) : (
        <Button icon="pi pi-ban" size="small" severity="danger" text rounded tooltip="Disable" tooltipOptions={{ position: 'top' }} loading={deleting} onClick={() => handleDelete(row)} />
      )}
    </div>
  )

  return (
    <div className="flex flex-column gap-4">
      <Toast ref={toast} position="top-right" />
      <ConfirmDialog />

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex align-items-center justify-content-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-xl font-semibold m-0">Categories</h2>
          <p className="text-sm mt-1 m-0" style={{ color: 'var(--text-color-secondary)' }}>
            Manage asset categories shown in the sidebar.
          </p>
        </div>
        <Button label="New Category" icon="pi pi-plus" onClick={openCreate} />
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      <DataTable
        value={categories}
        loading={loading}
        emptyMessage="No categories yet. Create one to get started."
        rowClassName={(row: Category) => row.isDeleted ? 'tt-row-disabled' : ''}
        stripedRows
        showGridlines={false}
        style={{ borderRadius: '12px', overflow: 'hidden' }}
      >
        <Column header="Category" body={nameTemplate}    style={{ minWidth: '200px' }} />
        <Column header="Color"    body={colorTemplate}   style={{ width: '80px' }} />
        <Column header="Status"   body={statusTemplate}  style={{ width: '110px' }} />
        <Column header=""         body={actionsTemplate} style={{ width: '100px' }} align="right" />
      </DataTable>

      {/* ── Dialog ──────────────────────────────────────────────── */}
      <Dialog
        visible={dialogOpen}
        onHide={() => setDialogOpen(false)}
        header={selected ? 'Edit Category' : 'New Category'}
        style={{ width: '480px' }}
        modal
        draggable={false}
        resizable={false}
      >
        <CategoryForm
          initial={selected}
          saving={saving}
          onSave={handleSave}
          onCancel={() => setDialogOpen(false)}
        />
      </Dialog>
    </div>
  )
}

export default CategoriesPage
