import { useState, useMemo, useEffect } from 'react'
import { Dialog } from 'primereact/dialog'
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
  <label style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' as const, color: 'var(--tt-text-muted)' }}>
    {children}
  </label>
)

const fieldInput: React.CSSProperties = {
  width: '100%', background: 'var(--tt-bg-input)', border: '1px solid var(--tt-border)',
  borderRadius: 9, padding: '10px 13px', color: 'var(--text-color)',
  fontFamily: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box',
}
const fieldSelect: React.CSSProperties = {
  ...fieldInput, appearance: 'auto' as const, cursor: 'pointer',
}

const IT_CATEGORY_ICONS: Record<string, string> = {
  hardware: '🖥', software: '💿', network: '📡',
  account: '🔐', printer: '🖨', setup: '⚙️', other: '🎫',
}

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

  const panelStyle: React.CSSProperties = {
    background: 'var(--surface-card)',
    border: '1px solid var(--tt-border-soft)',
    borderRadius: 12,
    overflow: 'hidden',
  }

  const panelHeaderStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 16px',
    borderBottom: '1px solid var(--tt-border-soft)',
  }

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
          <button type="button" onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: 'var(--primary-color)', border: 'none', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <i className="pi pi-plus" style={{ fontSize: 12 }} /> New IT Ticket
          </button>
        )}
      </div>

      {/* Metrics */}
      <div className="flex gap-3 flex-wrap">
        {METRICS.map(m => (
          <div key={m.label}
            className="flex flex-column flex-1 relative overflow-hidden"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--tt-border-soft)', borderRadius: 12, padding: '16px 18px', borderTop: `3px solid ${m.color}`, minWidth: 130 }}
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
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
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
        <div style={panelStyle}>
          <div style={{ ...panelHeaderStyle, gap: 12 }}>
            <span style={{ fontSize: 14 }}>🎫</span>
            <span className="font-semibold text-sm text-900">Support Tickets</span>
            <span className="font-mono text-xs text-500 ml-1">({tickets.length})</span>
            <input
              value={ticketSearch}
              onChange={e => setTicketSearch(e.target.value)}
              placeholder="Search…"
              style={{ marginLeft: 'auto', width: 160, background: 'var(--tt-bg-input)', border: '1px solid var(--tt-border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text-color)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }}
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
                    className="border-round-lg p-3 cursor-pointer"
                    style={{ background: 'var(--surface-section)', border: '1px solid var(--tt-border-soft)', transition: 'transform 0.12s' }}
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
                            background: 'transparent', border: '1px solid var(--tt-border)',
                            color: 'var(--text-color-secondary)', fontSize: 11, fontFamily: 'inherit',
                            cursor: 'pointer',
                          }}
                        >
                          Close
                        </button>
                      )}
                    </div>
                    {t.description && (
                      <div className="text-xs mt-2" style={{ color: 'var(--text-color-secondary)', borderTop: '1px solid var(--tt-border-soft)', paddingTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
          {/* Issue Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FieldLabel>Issue Title *</FieldLabel>
            <input
              style={fieldInput} value={form.title} autoFocus
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Projector not connecting"
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(79,143,255,0.5)')}
              onBlur={e  => (e.currentTarget.style.borderColor = 'var(--tt-border)')}
            />
          </div>
          {/* Category + Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <FieldLabel>Category</FieldLabel>
              <select style={fieldSelect} value={form.category} onChange={e => set('category', e.target.value as ITTicketFormData['category'])}>
                {TICKET_CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <FieldLabel>Priority</FieldLabel>
              <select style={fieldSelect} value={form.priority} onChange={e => set('priority', e.target.value as ITTicketFormData['priority'])}>
                {TICKET_PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          {/* Status + Linked Asset */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <FieldLabel>Status</FieldLabel>
              <select style={fieldSelect} value={form.status} onChange={e => set('status', e.target.value as ITTicketFormData['status'])}>
                {TICKET_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <FieldLabel>Linked Asset</FieldLabel>
              <select style={fieldSelect} value={form.assetId} onChange={e => set('assetId', e.target.value)}>
                <option value="">Select asset</option>
                {assetOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          {/* Reported By + Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <FieldLabel>Reported By</FieldLabel>
              <input
                style={fieldInput} value={form.reportedBy} placeholder="Name"
                onChange={e => set('reportedBy', e.target.value)}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(79,143,255,0.5)')}
                onBlur={e  => (e.currentTarget.style.borderColor = 'var(--tt-border)')}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <FieldLabel>Location</FieldLabel>
              <input
                style={fieldInput} value={form.location} placeholder="e.g. Room 204"
                onChange={e => set('location', e.target.value)}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(79,143,255,0.5)')}
                onBlur={e  => (e.currentTarget.style.borderColor = 'var(--tt-border)')}
              />
            </div>
          </div>
          {/* Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FieldLabel>Description</FieldLabel>
            <textarea
              style={{ ...fieldInput, resize: 'vertical', minHeight: 90 }}
              value={form.description} rows={3}
              onChange={e => set('description', e.target.value)}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(79,143,255,0.5)')}
              onBlur={e  => (e.currentTarget.style.borderColor = 'var(--tt-border)')}
            />
          </div>
          {/* Footer */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button
              type="button" onClick={() => setDialogOpen(false)} disabled={saving}
              style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--tt-surface-section)', border: '1px solid var(--tt-border)', color: 'var(--text-color)', fontFamily: 'inherit', fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.4 : 1 }}
            >
              Cancel
            </button>
            <button
              type="button" onClick={handleSave} disabled={saving || !form.title.trim()}
              style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--primary-color)', border: '1px solid var(--primary-color)', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: saving || !form.title.trim() ? 'not-allowed' : 'pointer', opacity: saving || !form.title.trim() ? 0.4 : 1 }}
            >
              {saving ? <><i className="pi pi-spin pi-spinner" style={{ fontSize: 13 }} /> Saving…</> : editing ? 'Save Changes' : 'Submit Ticket'}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export default ITManagementPage
