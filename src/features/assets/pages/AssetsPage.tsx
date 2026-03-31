import { useRef, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { Toast } from 'primereact/toast'
import { Tag } from 'primereact/tag'
import { InputText } from 'primereact/inputtext'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog'
import { assetService } from '../services/assetService'
import { useAssetMutations } from '../hooks/useAssetMutations'
import { usePermissions } from '../../auth/hooks/usePermissions'
import { categoryService } from '../../categories/services/categoryService'
import AssetForm from '../components/AssetForm'
import LifespanBar from '../components/LifespanBar'
import MetricsRow from '../components/MetricsRow'
import AlertStrip from '../components/AlertStrip'
import AssetDetailPanel from '../components/AssetDetailPanel'
import {
  getLifespanStatus,
  LIFESPAN_STATUS_LABEL,
  LIFESPAN_STATUS_SEVERITY,
} from '../types/asset.types'
import type { Asset, AssetFormData, AssetStatus } from '../types/asset.types'
import type { Category } from '../../categories/types/category.types'
import { CATEGORY_COLORS } from '../../categories/types/category.types'
import type { ColorKey } from '../../categories/types/category.types'

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
  const [assets, setAssets]           = useState<Asset[]>([])
  const [categories, setCategories]   = useState<Category[]>([])
  const [loading, setLoading]         = useState(true)
  const [dialogOpen, setDialogOpen]   = useState(false)
  const [selected, setSelected]       = useState<Asset | undefined>()
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [detailAsset, setDetailAsset] = useState<Asset | undefined>()
  const [searchParams]                = useSearchParams()

  const { saving, deleting, replicating, create, update, softDelete, restore, replicate } =
    useAssetMutations()
  const { can } = usePermissions()

  useEffect(() => {
    const unsubAssets = assetService.subscribeToAll((data) => { setAssets(data); setLoading(false) })
    const unsubCats   = categoryService.subscribeToActive((data) => setCategories(data))
    return () => { unsubAssets(); unsubCats() }
  }, [])

  // Reset local status filter when URL param changes
  useEffect(() => { setStatusFilter('all') }, [searchParams])

  const filterCategory = searchParams.get('category')
  const filterStatus   = searchParams.get('status')   // 'replace' from sidebar

  const visibleAssets = assets.filter((a) => {
    if (a.isDeleted) return false
    if (filterCategory && a.categoryId !== filterCategory) return false
    if (filterStatus === 'replace' && getLifespanStatus(a.purchaseDate, a.lifespanYears) !== 'replace') return false
    if (statusFilter !== 'all' && a.status !== statusFilter) return false
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

  const openCreate = () => { setSelected(undefined); setDialogOpen(true) }
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

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const formatDate  = (ts: { toDate(): Date }) => ts.toDate().toLocaleDateString('en-US')
    const escape      = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

    const headers = ['Name', 'Brand', 'Model', 'Category', 'Status', 'Serial Number', 'Asset Tag',
                     'Assigned To', 'Purchase Date', 'Purchase Price', 'Lifespan (yrs)', 'Notes']

    const rows = visibleAssets.map((a) => [
      escape(a.name),
      escape(a.brand),
      escape(a.model),
      escape(categoryMap[a.categoryId]?.name ?? ''),
      escape(a.status),
      escape(a.serialNumber),
      escape(a.assetTag),
      escape(a.assignedTo),
      escape(formatDate(a.purchaseDate)),
      escape(a.purchasePrice),
      escape(a.lifespanYears),
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

  const categoryTemplate = (row: Asset) => {
    const cat = categoryMap[row.categoryId]
    return cat
      ? <span className="text-sm">{cat.name}</span>
      : <span className="text-sm" style={{ opacity: 0.4 }}>—</span>
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
      <Button icon="pi pi-eye" size="small" severity="secondary" text rounded tooltip="View" tooltipOptions={{ position: 'top' }} onClick={() => setDetailAsset(row)} />
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

  const getPageTitle = () => {
    if (filterCategory) { const cat = categoryMap[filterCategory]; return cat ? cat.name : 'Assets' }
    if (filterStatus === 'replace') return 'Needs Replacing'
    return 'All Assets'
  }

  const showStatusChips = !filterStatus

  return (
    <div className="flex flex-column gap-4">
      <Toast ref={toast} position="top-right" />
      <ConfirmDialog />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex align-items-center justify-content-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-xl font-semibold m-0">{getPageTitle()}</h2>
          <p className="text-sm mt-1 m-0" style={{ color: 'var(--text-color-secondary)' }}>
            {visibleAssets.length} asset{visibleAssets.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2 align-items-center">
          <IconField iconPosition="left">
            <InputIcon className="pi pi-search" />
            <InputText
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets…"
              style={{ width: 220 }}
            />
          </IconField>
          {can('export_csv') && (
            <Button
              label="Export"
              icon="pi pi-download"
              severity="secondary"
              outlined
              onClick={handleExportCSV}
              disabled={visibleAssets.length === 0}
            />
          )}
          {can('add_asset') && (
            <Button label="Add Asset" icon="pi pi-plus" onClick={openCreate} />
          )}
        </div>
      </div>

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
      <DataTable
        value={visibleAssets}
        loading={loading}
        emptyMessage="No assets found."
        rowClassName={(row: Asset) => row.isDeleted ? 'tt-row-disabled' : ''}
        stripedRows
        showGridlines={false}
        style={{ borderRadius: '12px', overflow: 'hidden' }}
      >
        <Column header="Asset"    body={nameTemplate}     style={{ minWidth: 240 }} />
        <Column header="Category" body={categoryTemplate} style={{ minWidth: 120 }} />
        <Column field="assetTag"  header="Tag"            style={{ width: 100 }} />
        <Column header="Lifespan" body={lifespanTemplate} style={{ minWidth: 160 }} />
        <Column header=""         body={actionsTemplate}  style={{ width: 130 }} align="right" />
      </DataTable>

      {/* ── Detail panel ────────────────────────────────────────────── */}
      <AssetDetailPanel
        asset={detailAsset ?? null}
        categories={categories}
        visible={!!detailAsset}
        onHide={() => setDetailAsset(undefined)}
        onEdit={openEdit}
      />

      {/* ── Dialog ──────────────────────────────────────────────────── */}
      <Dialog
        visible={dialogOpen}
        onHide={() => setDialogOpen(false)}
        header={selected ? 'Edit Asset' : 'Add Asset'}
        style={{ width: '560px' }}
        modal
        draggable={false}
        resizable={false}
      >
        <AssetForm
          initial={selected}
          categories={categories}
          saving={saving}
          onSave={handleSave}
          onCancel={() => setDialogOpen(false)}
        />
      </Dialog>
    </div>
  )
}

export default AssetsPage
