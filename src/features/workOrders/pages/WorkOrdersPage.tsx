import { useState, useMemo, useEffect } from 'react'
import { Dialog } from 'primereact/dialog'
import { Dropdown } from 'primereact/dropdown'
import { Timestamp } from 'firebase/firestore'
import { useWorkOrders } from '../hooks/useWorkOrders'
import { useWorkOrderMutations } from '../hooks/useWorkOrderMutations'
import { useAssets } from '../../assets/hooks/useAssets'
import { usePermissions } from '../../auth/hooks/usePermissions'
import {
  WO_PRIORITY_OPTIONS, WO_STATUS_OPTIONS, WO_STATUS_LABEL,
  type WorkOrder, type WorkOrderFormData, type WOPriority, type WOStatus,
} from '../types/workOrder.types'
import { useTopbarTitle } from '../../../contexts/TopbarContext'

const EMPTY: WorkOrderFormData = {
  title: '', category: '', priority: 'medium', status: 'open',
  assignedTo: '', assetId: '', dueDate: null, estimatedCost: 0, notes: '',
}

// ── Styles ────────────────────────────────────────────────────────────────────
const PRIORITY_STYLE: Record<WOPriority, { bg: string; color: string; label: string }> = {
  critical: { bg: 'rgba(239,68,68,0.15)',   color: '#f87171', label: 'Critical' },
  high:     { bg: 'rgba(249,115,22,0.15)',  color: '#fb923c', label: 'High'     },
  medium:   { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24', label: 'Medium'   },
  low:      { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', label: 'Low'      },
}

const STATUS_STYLE: Record<WOStatus, { bg: string; color: string }> = {
  open:       { bg: 'rgba(79,143,255,0.15)',  color: '#4f8fff' },
  inprogress: { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
  completed:  { bg: 'rgba(34,197,94,0.15)',   color: '#22c55e' },
  onhold:     { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
  cancelled:  { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444' },
}

// ── Shared input style ────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: '100%', background: 'var(--surface-section)', border: '1px solid var(--tt-border)',
  borderRadius: 9, padding: '10px 13px', color: 'var(--text-color)', fontFamily: 'inherit',
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
}
const lbl: React.CSSProperties = {
  display: 'block', fontFamily: 'DM Mono, monospace', fontSize: 10, fontWeight: 600,
  letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--tt-text-muted)', marginBottom: 6,
}

const WO_CATEGORY_OPTIONS = [
  { label: '🔧 Maintenance',  value: 'Maintenance'  },
  { label: '🛠 Repair',       value: 'Repair'       },
  { label: '🔍 Inspection',   value: 'Inspection'   },
  { label: '📦 Installation', value: 'Installation' },
  { label: '🖥 IT Support',   value: 'IT Support'   },
  { label: '🧹 Cleaning',     value: 'Cleaning'     },
  { label: '⚠️ Safety',       value: 'Safety'       },
]

const WorkOrdersPage = () => {
  const { setTitle, clearTitle } = useTopbarTitle()
  const { workOrders, loading }  = useWorkOrders()
  const { assets }               = useAssets()
  const { saving, create, update, updateStatus, remove } = useWorkOrderMutations()
  const { can } = usePermissions()

  useEffect(() => { setTitle('Work Orders'); return clearTitle }, [])

  const [dialogOpen, setDialogOpen]     = useState(false)
  const [editing, setEditing]           = useState<WorkOrder | null>(null)
  const [form, setForm]                 = useState<WorkOrderFormData>(EMPTY)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const [confirmId, setConfirmId]       = useState<string | null>(null)

  const set = <K extends keyof WorkOrderFormData>(k: K, v: WorkOrderFormData[K]) =>
    setForm(p => ({ ...p, [k]: v }))

  const openNew  = () => { setEditing(null); setForm(EMPTY); setDialogOpen(true) }
  const openEdit = (wo: WorkOrder) => {
    setEditing(wo)
    setForm({ title: wo.title, category: wo.category, priority: wo.priority, status: wo.status, assignedTo: wo.assignedTo, assetId: wo.assetId, dueDate: wo.dueDate, estimatedCost: wo.estimatedCost ?? 0, notes: wo.notes })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) return
    const ok = editing ? await update(editing.id, form) : await create(form)
    if (ok) setDialogOpen(false)
  }

  const filtered = useMemo(() => {
    let list = workOrders
    if (filterStatus !== 'all') list = list.filter(w => w.status === filterStatus)
    return list
  }, [workOrders, filterStatus])

  const counts = useMemo(() => ({
    open:       workOrders.filter(w => w.status === 'open').length,
    inprogress: workOrders.filter(w => w.status === 'inprogress').length,
    completed:  workOrders.filter(w => w.status === 'completed').length,
    critical:   workOrders.filter(w => w.priority === 'critical').length,
  }), [workOrders])

  const assetMap     = Object.fromEntries(assets.map(a => [a.id, a.name]))
  const assetOptions = assets.map(a => ({ label: a.name, value: a.id }))

  const statusFilters = [
    { label: 'All',         value: 'all'        },
    { label: 'Open',        value: 'open'       },
    { label: 'In Progress', value: 'inprogress' },
    { label: 'Completed',   value: 'completed'  },
    { label: 'On Hold',     value: 'onhold'     },
  ]

  const METRICS = [
    { label: 'Open',        value: counts.open,       subtitle: 'awaiting action',  color: '#4f8fff', icon: 'pi pi-folder-open'        },
    { label: 'In Progress', value: counts.inprogress, subtitle: 'being worked on',  color: '#f59e0b', icon: 'pi pi-hammer'             },
    { label: 'Completed',   value: counts.completed,  subtitle: 'this period',      color: '#22c55e', icon: 'pi pi-check-circle'       },
    { label: 'Critical',    value: counts.critical,   subtitle: 'high priority',    color: '#ef4444', icon: 'pi pi-exclamation-circle' },
  ]

  const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const focusBorder  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.currentTarget.style.borderColor = 'rgba(79,143,255,0.5)')
  const blurBorder   = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.currentTarget.style.borderColor = 'var(--tt-border)')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-color)' }}>📋 Work Order Management</div>
          <div style={{ fontSize: 13, marginTop: 4, color: 'var(--tt-text-secondary)' }}>Create, track, and prioritize maintenance tasks from submission to completion</div>
        </div>
        {can('create_work_order') && (
          <button type="button" onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: 'var(--primary-color)', border: 'none', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            + New Work Order
          </button>
        )}
      </div>

      {/* Metrics */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {METRICS.map(m => (
          <div key={m.label} style={{ flex: 1, minWidth: 120, position: 'relative', overflow: 'hidden', background: 'var(--surface-card)', border: '1px solid var(--tt-border-soft)', borderRadius: 12, padding: '16px 18px', borderTop: `3px solid ${m.color}` }}>
            <i className={m.icon} style={{ position: 'absolute', right: 14, top: 14, fontSize: 18, color: m.color, opacity: 0.15 }} />
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--tt-text-muted)', marginBottom: 8 }}>{m.label}</div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 32, fontWeight: 700, lineHeight: 1, color: 'var(--text-color)' }}>{m.value}</div>
            <div style={{ fontSize: 11, marginTop: 4, color: 'var(--tt-text-dim)' }}>{m.subtitle}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {statusFilters.map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilterStatus(f.value)}
              style={{
                padding: '5px 14px', borderRadius: 99, fontFamily: 'DM Mono, monospace', fontSize: 11,
                cursor: 'pointer', transition: 'all 0.15s',
                background: filterStatus === f.value ? 'rgba(79,143,255,0.12)' : 'transparent',
                color:      filterStatus === f.value ? 'var(--primary-color)'  : 'var(--tt-text-secondary)',
                border:     filterStatus === f.value ? '1px solid rgba(79,143,255,0.4)' : '1px solid var(--tt-border)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: 'var(--tt-text-muted)', fontFamily: 'DM Mono, monospace' }}>
          {filtered.length} work order{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--tt-text-muted)' }}>
          <i className="pi pi-spin pi-spinner" style={{ fontSize: 24 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--tt-text-muted)' }}>
          <i className="pi pi-clipboard" style={{ fontSize: 40, display: 'block', marginBottom: 12, opacity: 0.2 }} />
          <div style={{ fontSize: 13 }}>No work orders found.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(wo => {
            const isOverdue = wo.dueDate && wo.dueDate.toDate() < new Date() && wo.status !== 'completed'
            const ps = PRIORITY_STYLE[wo.priority]
            const ss = STATUS_STYLE[wo.status]
            return (
              <div key={wo.id} style={{ background: 'var(--surface-card)', border: '1px solid var(--tt-border-soft)', borderRadius: 12, overflow: 'hidden' }}>
                {/* Card body */}
                <div style={{ padding: '14px 16px' }}>
                  {/* Title row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--tt-text-primary)', lineHeight: 1.4, flex: 1 }}>
                      🔧 {wo.title}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontFamily: 'DM Mono, monospace', fontWeight: 700, background: ps.bg, color: ps.color, textTransform: 'uppercase' }}>
                        {ps.label}
                      </span>
                      <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontFamily: 'DM Mono, monospace', fontWeight: 600, background: ss.bg, color: ss.color }}>
                        {WO_STATUS_LABEL[wo.status]}
                      </span>
                    </div>
                  </div>
                  {/* ID + created */}
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--tt-text-muted)', marginTop: 4 }}>
                    #{wo.id.slice(-8).toUpperCase()} · Created {fmtDate(wo.createdAt.toDate())}
                  </div>
                  {/* Notes */}
                  {wo.notes && (
                    <div style={{ fontSize: 13, color: 'var(--tt-text-secondary)', marginTop: 6, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                      {wo.notes}
                    </div>
                  )}
                  {/* Meta row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
                    {wo.assignedTo && (
                      <span style={{ fontSize: 12, color: 'var(--tt-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <i className="pi pi-user" style={{ fontSize: 11 }} /> {wo.assignedTo}
                      </span>
                    )}
                    {wo.dueDate && (
                      <span style={{ fontSize: 12, color: isOverdue ? '#f87171' : 'var(--tt-text-secondary)', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'DM Mono, monospace' }}>
                        <i className="pi pi-calendar" style={{ fontSize: 11 }} /> Due {fmtDate(wo.dueDate.toDate())}
                      </span>
                    )}
                    {wo.assetId && assetMap[wo.assetId] && (
                      <span style={{ fontSize: 12, color: 'var(--tt-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <i className="pi pi-box" style={{ fontSize: 11 }} /> {assetMap[wo.assetId]}
                      </span>
                    )}
                    {!!wo.estimatedCost && (
                      <span style={{ fontSize: 12, color: 'var(--tt-text-secondary)', fontFamily: 'DM Mono, monospace' }}>
                        ${wo.estimatedCost}
                      </span>
                    )}
                  </div>
                </div>
                {/* Action bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, borderTop: '1px solid var(--tt-border-faint)', background: 'var(--tt-hover-bg-xs)' }}>
                  {can('edit_work_order') && (
                    <button type="button" onClick={() => openEdit(wo)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 16px', background: 'transparent', border: 'none', borderRight: '1px solid var(--tt-border-faint)', color: 'var(--tt-text-secondary)', fontFamily: 'inherit', fontSize: 12, cursor: 'pointer' }}>
                      <i className="pi pi-pencil" style={{ fontSize: 11 }} /> Edit
                    </button>
                  )}
                  <div style={{ flex: 1, padding: '4px 8px' }}>
                    <select
                      value={wo.status}
                      onChange={e => updateStatus(wo.id, e.target.value as WOStatus)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--tt-text-secondary)', fontFamily: 'inherit', fontSize: 12, cursor: 'pointer', outline: 'none', width: '100%' }}
                    >
                      {WO_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  {can('edit_work_order') && (
                    <button
                      type="button"
                      disabled={deletingId === wo.id}
                      onClick={() => setConfirmId(wo.id)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 14px', background: 'transparent', border: 'none', borderLeft: '1px solid var(--tt-border-faint)', color: 'rgba(239,68,68,0.6)', fontFamily: 'inherit', fontSize: 13, cursor: deletingId === wo.id ? 'not-allowed' : 'pointer', opacity: deletingId === wo.id ? 0.5 : 1 }}
                    >
                      {deletingId === wo.id
                        ? <i className="pi pi-spin pi-spinner" style={{ fontSize: 12 }} />
                        : <i className="pi pi-trash" style={{ fontSize: 12 }} />}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog
        header={editing ? 'Edit Work Order' : 'New Work Order'}
        visible={dialogOpen}
        onHide={() => setDialogOpen(false)}
        style={{ width: '580px' }}
        modal
        blockScroll
        draggable={false}
        resizable={false}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8, position: 'relative' }}>
          {saving && (
            <div className="tt-form-saving-overlay">
              <i className="pi pi-spin pi-spinner" />
              <span>Saving…</span>
            </div>
          )}
          {/* Title */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={lbl}>Title *</label>
            <input style={inp} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Replace projector bulb" autoFocus
              onFocus={focusBorder} onBlur={blurBorder} />
          </div>
          {/* Category + Asset */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={lbl}>Category</label>
              <Dropdown
                value={form.category || null}
                options={WO_CATEGORY_OPTIONS}
                onChange={e => set('category', e.value ?? '')}
                placeholder="Select category"
                appendTo={document.body}
                style={{ width: '100%' }}
                className="tt-form-dropdown"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={lbl}>Linked Asset</label>
              <Dropdown
                value={form.assetId || null}
                options={assetOptions}
                onChange={e => set('assetId', e.value ?? '')}
                placeholder="Select asset"
                appendTo={document.body}
                filter
                style={{ width: '100%' }}
                className="tt-form-dropdown"
              />
            </div>
          </div>
          {/* Priority + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={lbl}>Priority</label>
              <Dropdown
                value={form.priority}
                options={WO_PRIORITY_OPTIONS}
                onChange={e => set('priority', e.value as WOPriority)}
                appendTo={document.body}
                style={{ width: '100%' }}
                className="tt-form-dropdown"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={lbl}>Status</label>
              <Dropdown
                value={form.status}
                options={WO_STATUS_OPTIONS}
                onChange={e => set('status', e.value as WOStatus)}
                appendTo={document.body}
                style={{ width: '100%' }}
                className="tt-form-dropdown"
              />
            </div>
          </div>
          {/* Assigned + Due Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={lbl}>Assigned To</label>
              <input style={inp} value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)} placeholder="Name or dept."
                onFocus={focusBorder} onBlur={blurBorder} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={lbl}>Due Date</label>
              <input type="date" style={inp}
                value={form.dueDate ? form.dueDate.toDate().toISOString().split('T')[0] : ''}
                onChange={e => set('dueDate', e.target.value ? Timestamp.fromDate(new Date(e.target.value + 'T00:00:00')) : null)}
                onFocus={focusBorder} onBlur={blurBorder} />
            </div>
          </div>
          {/* Estimated Cost */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={lbl}>Estimated Cost ($)</label>
            <input type="number" style={inp} value={form.estimatedCost || ''} onChange={e => set('estimatedCost', Number(e.target.value))} placeholder="0" min={0}
              onFocus={focusBorder} onBlur={blurBorder} />
          </div>
          {/* Notes */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={lbl}>Description</label>
            <textarea style={{ ...inp, resize: 'vertical', minHeight: 80 }} value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Describe the issue or task..."
              onFocus={focusBorder} onBlur={blurBorder} />
          </div>
          {/* Footer */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" onClick={() => setDialogOpen(false)} disabled={saving} style={{ padding: '8px 18px', borderRadius: 8, background: 'transparent', border: '1px solid var(--tt-border)', color: 'var(--tt-text-secondary)', fontFamily: 'inherit', fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.4 : 1 }}>
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={saving || !form.title.trim()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, background: 'var(--primary-color)', border: 'none', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: saving || !form.title.trim() ? 'not-allowed' : 'pointer', opacity: saving || !form.title.trim() ? 0.4 : 1 }}>
              {saving ? <><i className="pi pi-spin pi-spinner" style={{ fontSize: 12 }} /> Saving…</> : editing ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </div>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog
        visible={!!confirmId}
        onHide={() => setConfirmId(null)}
        modal
        blockScroll
        draggable={false}
        resizable={false}
        style={{ width: 400 }}
        header={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="pi pi-exclamation-triangle" style={{ color: '#ef4444', fontSize: 18 }} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Delete Work Order</span>
          </div>
        }
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setConfirmId(null)} style={{ padding: '8px 18px', borderRadius: 8, background: 'transparent', border: '1px solid var(--tt-border)', color: 'var(--tt-text-secondary)', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              type="button"
              disabled={!!deletingId}
              onClick={async () => {
                if (!confirmId) return
                setDeletingId(confirmId)
                await remove(confirmId)
                setDeletingId(null)
                setConfirmId(null)
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, background: '#ef4444', border: 'none', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: deletingId ? 'not-allowed' : 'pointer', opacity: deletingId ? 0.5 : 1 }}
            >
              {deletingId ? <><i className="pi pi-spin pi-spinner" style={{ fontSize: 12 }} /> Deleting…</> : 'Yes, Delete'}
            </button>
          </div>
        }
      >
        <p style={{ fontSize: 13, color: 'var(--tt-text-secondary)', margin: 0, lineHeight: 1.6 }}>
          Are you sure you want to delete this work order? This action cannot be undone.
        </p>
      </Dialog>
    </div>
  )
}

export default WorkOrdersPage
