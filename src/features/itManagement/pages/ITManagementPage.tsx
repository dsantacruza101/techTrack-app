import { useState, useMemo, useEffect } from 'react'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { InputText } from 'primereact/inputtext'
import { Dropdown } from 'primereact/dropdown'
import { InputTextarea } from 'primereact/inputtextarea'
import { useITTickets } from '../hooks/useITTickets'
import { useITTicketMutations } from '../hooks/useITTicketMutations'
import { useAssets } from '../../assets/hooks/useAssets'
import { useCategories } from '../../categories/hooks/useCategories'
import { usePermissions } from '../../auth/hooks/usePermissions'
import { CATEGORY_COLORS } from '../../categories/types/category.types'
import type { ColorKey } from '../../categories/types/category.types'
import {
  TICKET_CATEGORY_OPTIONS, TICKET_PRIORITY_OPTIONS, TICKET_STATUS_OPTIONS,
  type ITTicket, type ITTicketFormData, type TicketPriority, type TicketStatus,
} from '../types/itTicket.types'
import { useTopbarTitle } from '../../../contexts/TopbarContext'

const EMPTY: ITTicketFormData = {
  title: '', category: 'other', priority: 'medium', status: 'open',
  reportedBy: '', location: '', assetId: '', description: '',
}

const PRIORITY_STYLE: Record<TicketPriority, { bg: string; color: string }> = {
  critical: { bg: 'rgba(239,68,68,0.15)',   color: '#f87171' },
  high:     { bg: 'rgba(249,115,22,0.15)',  color: '#fb923c' },
  medium:   { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24' },
  low:      { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
}

const STATUS_STYLE: Record<TicketStatus, { bg: string; color: string; label: string }> = {
  open:       { bg: 'rgba(79,143,255,0.15)',  color: '#4f8fff', label: 'Open'        },
  inprogress: { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24', label: 'In Progress' },
  resolved:   { bg: 'rgba(34,197,94,0.15)',   color: '#4ade80', label: 'Resolved'    },
  closed:     { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', label: 'Closed'      },
}

const PillBadge = ({ bg, color, label }: { bg: string; color: string; label: string }) => (
  <span className="font-mono" style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99 }}>
    {label}
  </span>
)

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="font-mono text-xs" style={{ letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-color-secondary)' }}>
    {children}
  </label>
)

const IT_CATEGORY_ICONS: Record<string, string> = {
  hardware: '🖥', software: '💿', network: '📡',
  account: '🔐', printer: '🖨', setup: '⚙️', other: '🎫',
}

// IT-related category IDs (customize if needed)
const IT_CAT_IDS = new Set(['mac', 'macpro', 'ipad', 'chromebook', 'network', 'printer', 'projector', 'accessory', 'security'])

const ITManagementPage = () => {
  const { setTitle, clearTitle } = useTopbarTitle()
  const { tickets, loading } = useITTickets()
  const { assets }           = useAssets()
  const { categories }       = useCategories()
  const { saving, create, update } = useITTicketMutations()
  const { can }              = usePermissions()

  useEffect(() => { setTitle('IT Management'); return clearTitle }, [])

  const [dialogOpen, setDialogOpen]     = useState(false)
  const [editing, setEditing]           = useState<ITTicket | null>(null)
  const [form, setForm]                 = useState<ITTicketFormData>(EMPTY)
  const [ticketSearch, setTicketSearch] = useState('')

  const set = <K extends keyof ITTicketFormData>(k: K, v: ITTicketFormData[K]) =>
    setForm(p => ({ ...p, [k]: v }))

  const openNew  = () => { setEditing(null); setForm(EMPTY); setDialogOpen(true) }
  const openEdit = (t: ITTicket) => {
    setEditing(t)
    setForm({ title: t.title, category: t.category, priority: t.priority, status: t.status, reportedBy: t.reportedBy, location: t.location, assetId: t.assetId, description: t.description })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) return
    const ok = editing ? await update(editing.id, form) : await create(form)
    if (ok) setDialogOpen(false)
  }

  const itAssets = useMemo(() => assets.filter(a => !a.isDeleted && IT_CAT_IDS.has(a.categoryId)), [assets])

  const filteredTickets = useMemo(() => {
    if (!ticketSearch.trim()) return tickets
    const q = ticketSearch.toLowerCase()
    return tickets.filter(t => t.title.toLowerCase().includes(q) || t.reportedBy.toLowerCase().includes(q))
  }, [tickets, ticketSearch])

  const counts = useMemo(() => ({
    itAssets: itAssets.length,
    open:     tickets.filter(t => t.status === 'open').length,
    network:  assets.filter(a => !a.isDeleted && a.categoryId === 'network').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  }), [tickets, assets, itAssets])

  // Group IT assets by category for display
  const assetsByCategory = useMemo(() => {
    const groups: Record<string, typeof assets> = {}
    for (const a of itAssets) {
      if (!groups[a.categoryId]) groups[a.categoryId] = []
      groups[a.categoryId].push(a)
    }
    return groups
  }, [itAssets])

  const assetOptions = assets.map(a => ({ label: a.name, value: a.id }))

  const METRICS = [
    { label: 'IT Assets',       value: counts.itAssets, color: '#4f8fff', icon: 'pi pi-desktop'      },
    { label: 'Open Tickets',    value: counts.open,     color: '#f59e0b', icon: 'pi pi-ticket'       },
    { label: 'Network Devices', value: counts.network,  color: '#7c3aed', icon: 'pi pi-wifi'         },
    { label: 'Resolved',        value: counts.resolved, color: '#22c55e', icon: 'pi pi-check-circle' },
  ]

  return (
    <div className="flex flex-column gap-4">

      {/* Header */}
      <div className="flex align-items-center justify-content-between flex-wrap gap-3">
        <div>
          <div className="font-serif text-2xl font-bold text-900">🖥 IT Asset &amp; Support Management</div>
          <div className="text-sm mt-1" style={{ color: 'var(--text-color-secondary)' }}>
            Manage IT infrastructure and track support requests
          </div>
        </div>
        {can('submit_it_ticket') && (
          <Button label="+ New IT Ticket" icon="pi pi-plus" onClick={openNew} />
        )}
      </div>

      {/* Metrics */}
      <div className="flex gap-3 flex-wrap">
        {METRICS.map(m => (
          <div key={m.label}
            className="flex flex-column flex-1 relative overflow-hidden"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 12, padding: '16px 18px', borderTop: `3px solid ${m.color}`, minWidth: 130 }}
          >
            <i className={m.icon} style={{ position: 'absolute', right: 14, top: 14, fontSize: 18, color: m.color, opacity: 0.15 }} />
            <div className="font-mono uppercase mb-2" style={{ fontSize: 10, letterSpacing: '2px', color: 'var(--text-color-secondary)' }}>{m.label}</div>
            <div className="font-serif font-bold text-900" style={{ fontSize: 32, lineHeight: 1 }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="tt-two-col">

        {/* Left: IT Assets by Type */}
        <div className="surface-card border-round-xl border-1 border-white-alpha-10 overflow-hidden">
          <div className="flex align-items-center gap-2 px-4 py-3 border-bottom-1 border-white-alpha-10">
            <span style={{ fontSize: 14 }}>🖥</span>
            <span className="font-semibold text-sm text-900">IT Assets by Type</span>
            <span className="font-mono text-xs text-500 ml-1">({itAssets.length})</span>
          </div>
          {loading ? (
            <div className="p-5 text-center"><i className="pi pi-spin pi-spinner text-xl text-500" /></div>
          ) : Object.keys(assetsByCategory).length === 0 ? (
            <div className="p-5 text-center text-sm" style={{ color: 'var(--text-color-secondary)' }}>
              <i className="pi pi-desktop text-3xl mb-2 block opacity-20" />
              No IT assets tracked.
            </div>
          ) : (
            <div className="p-3 flex flex-column gap-3">
              {Object.entries(assetsByCategory).map(([catId, catAssets]) => {
                const cat   = categories.find(c => c.id === catId)
                const color = cat ? (CATEGORY_COLORS[cat.colorKey as ColorKey] ?? CATEGORY_COLORS.blue) : CATEGORY_COLORS.blue
                return (
                  <div key={catId}>
                    <div className="flex align-items-center gap-2 mb-2">
                      <div className="flex align-items-center justify-content-center border-round flex-shrink-0"
                        style={{ width: 22, height: 22, background: color.bg }}>
                        <i className={cat?.icon ?? 'pi pi-box'} style={{ fontSize: 11, color: color.text }} />
                      </div>
                      <span className="font-semibold text-xs text-900">{cat?.name ?? catId}</span>
                      <span className="font-mono text-xs text-500 ml-auto">{catAssets.length}</span>
                    </div>
                    <div className="flex flex-column gap-1">
                      {catAssets.map(a => (
                        <div key={a.id}
                          className="flex align-items-center gap-2 border-round px-3 py-2"
                          style={{ background: 'var(--surface-section)' }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-900" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                            {a.serialNumber && <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-color-secondary)' }}>{a.serialNumber}</div>}
                          </div>
                          {a.location && <span style={{ fontSize: 10, color: 'var(--text-color-secondary)', fontFamily: 'DM Mono, monospace' }}>{a.location}</span>}
                          <div className="border-round-full flex-shrink-0"
                            style={{ width: 7, height: 7, background: a.status === 'active' ? '#22c55e' : a.status === 'maintenance' ? '#f59e0b' : '#94a3b8' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Support Tickets */}
        <div className="surface-card border-round-xl border-1 border-white-alpha-10 overflow-hidden">
          <div className="flex align-items-center gap-3 px-4 py-3 border-bottom-1 border-white-alpha-10">
            <span style={{ fontSize: 14 }}>🎫</span>
            <span className="font-semibold text-sm text-900">Support Tickets</span>
            <span className="font-mono text-xs text-500 ml-1">({tickets.length})</span>
            <InputText
              value={ticketSearch}
              onChange={e => setTicketSearch(e.target.value)}
              placeholder="Search…"
              className="p-inputtext-sm ml-auto"
              style={{ width: 160 }}
            />
          </div>

          {loading ? (
            <div className="p-5 text-center"><i className="pi pi-spin pi-spinner text-xl text-500" /></div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-5 text-center text-sm" style={{ color: 'var(--text-color-secondary)' }}>
              <i className="pi pi-ticket text-3xl mb-2 block opacity-20" />
              No tickets found.
            </div>
          ) : (
            <div className="p-3 flex flex-column gap-2" style={{ maxHeight: 560, overflowY: 'auto' }}>
              {filteredTickets.map(t => {
                const ps  = PRIORITY_STYLE[t.priority]
                const ss  = STATUS_STYLE[t.status]
                const ico = IT_CATEGORY_ICONS[t.category] ?? '🎫'
                return (
                  <div
                    key={t.id}
                    className="border-round-lg border-1 border-white-alpha-10 p-3 cursor-pointer"
                    style={{ background: 'var(--surface-section)', transition: 'transform 0.12s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}
                    onClick={() => can('manage_it_tickets') && openEdit(t)}
                  >
                    <div className="flex align-items-start gap-2 mb-2">
                      <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1.4 }}>{ico}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-900">{t.title}</div>
                        {t.location && <div className="text-xs mt-1" style={{ color: 'var(--text-color-secondary)' }}>📍 {t.location}</div>}
                      </div>
                      <span className="font-mono flex-shrink-0" style={{ fontSize: 10, color: 'var(--text-color-secondary)', opacity: 0.5 }}>#{t.id.slice(-5).toUpperCase()}</span>
                    </div>
                    <div className="flex align-items-center gap-2 flex-wrap">
                      <PillBadge bg={ps.bg} color={ps.color} label={t.priority.charAt(0).toUpperCase() + t.priority.slice(1)} />
                      <PillBadge bg={ss.bg} color={ss.color} label={ss.label} />
                      {t.reportedBy && <span className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>→ {t.reportedBy}</span>}
                      <span className="text-xs font-mono" style={{ color: 'var(--text-color-secondary)' }}>
                        {TICKET_CATEGORY_OPTIONS.find(o => o.value === t.category)?.label ?? t.category}
                      </span>
                      {t.status !== 'closed' && can('manage_it_tickets') && (
                        <button
                          onClick={async e => { e.stopPropagation(); await update(t.id, { status: 'closed' }) }}
                          style={{
                            marginLeft: 'auto', padding: '2px 10px', borderRadius: 6,
                            background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                            color: 'var(--text-color-secondary)', fontSize: 11, fontFamily: 'inherit',
                            cursor: 'pointer',
                          }}
                        >
                          Close
                        </button>
                      )}
                    </div>
                    {t.description && (
                      <div className="text-xs mt-2" style={{ color: 'var(--text-color-secondary)', borderTop: '1px solid var(--surface-border)', paddingTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.description}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dialog */}
      <Dialog
        header={editing ? 'Edit Ticket' : 'New IT Support Ticket'}
        visible={dialogOpen}
        onHide={() => setDialogOpen(false)}
        style={{ width: '560px' }}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="flex flex-column gap-4 pt-2">
          <div className="flex flex-column gap-2">
            <FieldLabel>Issue Title *</FieldLabel>
            <InputText value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Projector not connecting" className="w-full" autoFocus />
          </div>
          <div className="grid">
            <div className="col-6 flex flex-column gap-2">
              <FieldLabel>Category</FieldLabel>
              <Dropdown value={form.category} options={TICKET_CATEGORY_OPTIONS} onChange={e => set('category', e.value)} className="w-full" />
            </div>
            <div className="col-6 flex flex-column gap-2">
              <FieldLabel>Priority</FieldLabel>
              <Dropdown value={form.priority} options={TICKET_PRIORITY_OPTIONS} onChange={e => set('priority', e.value)} className="w-full" />
            </div>
          </div>
          <div className="grid">
            <div className="col-6 flex flex-column gap-2">
              <FieldLabel>Status</FieldLabel>
              <Dropdown value={form.status} options={TICKET_STATUS_OPTIONS} onChange={e => set('status', e.value)} className="w-full" />
            </div>
            <div className="col-6 flex flex-column gap-2">
              <FieldLabel>Linked Asset</FieldLabel>
              <Dropdown value={form.assetId} options={assetOptions} onChange={e => set('assetId', e.value)} placeholder="Select asset" className="w-full" showClear filter />
            </div>
          </div>
          <div className="grid">
            <div className="col-6 flex flex-column gap-2">
              <FieldLabel>Reported By</FieldLabel>
              <InputText value={form.reportedBy} onChange={e => set('reportedBy', e.target.value)} placeholder="Name" className="w-full" />
            </div>
            <div className="col-6 flex flex-column gap-2">
              <FieldLabel>Location</FieldLabel>
              <InputText value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Room 204" className="w-full" />
            </div>
          </div>
          <div className="flex flex-column gap-2">
            <FieldLabel>Description</FieldLabel>
            <InputTextarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className="w-full" autoResize />
          </div>
          <div className="flex gap-2 justify-content-end">
            <Button label="Cancel" severity="secondary" outlined onClick={() => setDialogOpen(false)} disabled={saving} />
            <Button
              label={saving ? '' : editing ? 'Save Changes' : 'Submit Ticket'}
              icon={saving ? 'pi pi-spin pi-spinner' : undefined}
              disabled={saving || !form.title.trim()}
              onClick={handleSave}
            />
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export default ITManagementPage
