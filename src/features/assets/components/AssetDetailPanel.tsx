import { useState } from 'react'
import { Sidebar } from 'primereact/sidebar'
import { Dialog } from 'primereact/dialog'
import { Timestamp } from 'firebase/firestore'
import { getLifespanPercent } from '../types/asset.types'
import { CATEGORY_COLORS } from '../../categories/types/category.types'
import type { Asset } from '../types/asset.types'
import type { Category, ColorKey, CareTask } from '../../categories/types/category.types'
import { assetService } from '../services/assetService'

interface AssetDetailPanelProps {
  asset: Asset | null
  categories: Category[]
  workOrders?: { id: string; assetId: string; title: string; status: string; priority: string }[]
  visible: boolean
  onHide: () => void
  onEdit: (asset: Asset) => void
  onDuplicate?: (asset: Asset) => void
  onDelete?: (asset: Asset) => void
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  active:      { bg: 'rgba(34,197,94,0.15)',   color: '#22c55e',               label: 'active'      },
  maintenance: { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b',               label: 'maintenance' },
  storage:     { bg: 'rgba(79,143,255,0.15)',   color: '#4f8fff',               label: 'in storage'  },
  retired:     { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', label: 'retired'     },
}

const FREQ_BADGE: Record<string, { bg: string; color: string }> = {
  daily:     { bg: 'rgba(34,197,94,0.14)',   color: '#22c55e' },
  weekly:    { bg: 'rgba(79,143,255,0.14)',   color: '#4f8fff' },
  monthly:   { bg: 'rgba(245,158,11,0.14)',   color: '#f59e0b' },
  quarterly: { bg: 'rgba(249,115,22,0.14)',   color: '#f97316' },
  annually:  { bg: 'rgba(124,58,237,0.14)',   color: '#7c3aed' },
  asneeded:  { bg: 'rgba(255,255,255,0.08)',  color: 'rgba(255,255,255,0.5)' },
}


// ── Key-value row ────────────────────────────────────────────────
const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
  }}>
    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)' }}>{label}</span>
    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.88)', textAlign: 'right', maxWidth: '60%' }}>{children}</span>
  </div>
)

const Pill = ({ bg, color, label }: { bg: string; color: string; label: string }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '2px 9px', borderRadius: 99,
    background: bg, color,
    fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 500,
  }}>
    <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
    {label}
  </span>
)

type TabId = 'info' | 'lifespan' | 'care'

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'info',     icon: '📋', label: 'Info'     },
  { id: 'lifespan', icon: '⏱', label: 'Lifespan' },
  { id: 'care',     icon: '🔧', label: 'Care'     },
]

const AssetDetailPanel = ({ asset, categories, visible, onHide, onEdit, onDuplicate, onDelete }: AssetDetailPanelProps) => {
  const [activeTab, setActiveTab]         = useState<TabId>('info')
  const [loggingTask, setLoggingTask]     = useState<string | null>(null)
  const [showLogModal, setShowLogModal]   = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const [taskDates, setTaskDates]         = useState<Record<string, string>>({})
  const [customTask, setCustomTask]       = useState('')
  const [loggingCustom, setLoggingCustom] = useState(false)

  if (!asset) return null



  const cat     = categories.find(c => c.id === asset.categoryId)
  const color   = cat ? (CATEGORY_COLORS[cat.colorKey as ColorKey] ?? CATEGORY_COLORS.blue) : CATEGORY_COLORS.blue
  const pct     = Math.round(getLifespanPercent(asset.purchaseDate, asset.lifespanYears) * 100)
  const replaceBy = new Date(asset.purchaseDate.toDate())
  replaceBy.setFullYear(replaceBy.getFullYear() + asset.lifespanYears)

  const fmt      = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
  const fmtFull  = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  const fmtPrice = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  const careTasks: CareTask[] = cat?.careTasks ?? []

  const schoolLabel = asset.school === 'school_a' ? '🏫 School A' : asset.school === 'school_b' ? '🏫 School B' : asset.school

  // ── Footer button styles ─────────────────────────────────────
  const ftBtn: React.CSSProperties = {
    width: '25%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '8px 0', borderRadius: 8, fontFamily: 'inherit', fontSize: 13,
    cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
    background: 'var(--surface-section)', color: 'var(--text-color)',
  }
  const ftIconBtn: React.CSSProperties = {
    width: '25%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '8px 0', borderRadius: 8, fontFamily: 'inherit', fontSize: 14,
    cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
    background: 'var(--surface-section)', color: 'var(--text-color)', flexShrink: 0,
  }

  return (
    <>
    <Sidebar
      visible={visible}
      onHide={onHide}
      position="right"
      className="w-full md:w-25rem"
      dismissable
      blockScroll
      pt={{
        root:    { style: { background: '#131720', borderLeft: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', height: '100%' } },
        header:  { style: { display: 'none' } },
        content: { style: { padding: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 } },
      }}
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{ padding: '18px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: color.bg, color: color.text, fontSize: 20,
            }}>
              <i className={cat?.icon ?? 'pi pi-box'} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'rgba(255,255,255,0.92)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {asset.name}
              </div>
              {asset.serialNumber && (
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
                  {asset.serialNumber}
                </div>
              )}
            </div>
          </div>
          <button type="button" onClick={onHide} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16, padding: 4, flexShrink: 0, lineHeight: 1 }}>
            ✕
          </button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '10px 8px', border: 'none', cursor: 'pointer',
              background: 'transparent', fontFamily: 'inherit', fontSize: 13,
              color: activeTab === tab.id ? 'var(--primary-color)' : 'rgba(255,255,255,0.4)',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary-color)' : '2px solid transparent',
              marginBottom: -1, transition: 'color 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────────────── */}
      <div style={{ overflowY: 'auto', minHeight: 0 }}>

        {/* Info tab */}
        {activeTab === 'info' && (
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 4 }}>
              Asset Details
            </div>
            {asset.school    && <Row label="School">{schoolLabel}</Row>}
            {asset.model     && <Row label="Model">{asset.model}</Row>}
            {cat             && <Row label="Category">{cat.name}</Row>}
            {asset.subcategoryId && <Row label="Subcategory">{asset.subcategoryId}</Row>}
            <Row label="Status">
              <Pill {...(STATUS_BADGE[asset.status ?? 'active'] ?? STATUS_BADGE.active)} />
            </Row>
            {asset.assignedTo && <Row label="Assigned To">{asset.assignedTo}</Row>}
            {asset.location   && <Row label="Location">{asset.location}</Row>}
            <Row label="Purchase Date">{fmt(asset.purchaseDate.toDate())}</Row>
            {(asset.estimatedValue || asset.purchasePrice) && (
              <Row label="Est. Value">{fmtPrice(asset.estimatedValue || asset.purchasePrice)}</Row>
            )}
            {asset.warrantyExpiry && <Row label="Warranty Exp.">{fmtFull(asset.warrantyExpiry.toDate())}</Row>}
            {asset.notes && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 8 }}>Notes</div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>{asset.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Lifespan tab */}
        {activeTab === 'lifespan' && (() => {
          const yearsRemaining = Math.max(0, asset.lifespanYears * (1 - pct / 100))
          const progressColor  = pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : '#22c55e'
          return (
            <div style={{ padding: '16px 20px' }}>
              <div style={{ background: 'var(--surface-section)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px' }}>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Lifespan Progress</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{pct}% used</span>
                </div>
                {/* Progress bar */}
                <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: progressColor, borderRadius: 99, transition: 'width 0.4s' }} />
                </div>
                {/* Years remaining */}
                <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 34, fontWeight: 700, color: progressColor, lineHeight: 1, marginBottom: 5, letterSpacing: '-0.5px' }}>
                  {yearsRemaining.toFixed(1)} years
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', marginBottom: 16, fontStyle: 'italic' }}>
                  remaining before replacement
                </div>
                {/* Divider */}
                <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 12 }} />
                {/* Rows */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)' }}>Replace by</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.88)' }}>{fmt(replaceBy)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)' }}>Total lifespan</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.88)' }}>{asset.lifespanYears} year{asset.lifespanYears !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Care tab */}
        {activeTab === 'care' && (
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {careTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)' }}>
                <i className="pi pi-calendar" style={{ fontSize: 32, display: 'block', marginBottom: 12, opacity: 0.3 }} />
                <div style={{ fontSize: 13 }}>No care tasks for {cat?.name ?? 'this category'}.</div>
                <div style={{ fontSize: 11, marginTop: 4, opacity: 0.6 }}>Add tasks in Options → Category Manager.</div>
              </div>
            ) : (
              <>
                {/* Log Service button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 2 }}>
                  <button
                    type="button"
                    onClick={() => { setTaskDates({}); setCustomTask(''); setShowLogModal(true) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'var(--primary-color)', border: 'none', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    <i className="pi pi-wrench" style={{ fontSize: 12 }} /> Log Service
                  </button>
                </div>
                {/* Task cards */}
                {careTasks.map(task => {
                  const lastDone  = asset.careCompletions?.[task.id]
                  const freq      = FREQ_BADGE[task.freq] ?? FREQ_BADGE.monthly
                  const freqDays: Record<string, number> = { daily: 1, weekly: 7, monthly: 30, quarterly: 91, annually: 365 }
                  const days      = freqDays[task.freq] ?? 0
                  const isOverdue = days > 0 && (!lastDone || (Date.now() - lastDone.toDate().getTime()) > days * 86400000)
                  return (
                    <div key={task.id} style={{
                      background: 'rgba(255,255,255,0.03)', borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.07)', padding: '12px 14px',
                    }}>
                      {/* Top row: badge + task name */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 700, letterSpacing: '0.5px', background: freq.bg, color: freq.color, whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                          {task.freq}
                        </span>
                        <span style={{ fontWeight: 500, fontSize: 13, color: 'rgba(255,255,255,0.88)' }}>{task.task}</span>
                      </div>
                      {/* Bottom row: overdue status + last date */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        {isOverdue ? (
                          <>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                            <span style={{ color: '#ef4444', fontWeight: 600, fontFamily: 'DM Mono, monospace', fontSize: 11 }}>OVERDUE</span>
                            <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
                          </>
                        ) : (
                          <>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                            <span style={{ color: '#22c55e', fontWeight: 600, fontFamily: 'DM Mono, monospace', fontSize: 11 }}>OK</span>
                            <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
                          </>
                        )}
                        <span style={{ color: 'rgba(255,255,255,0.38)', fontFamily: 'DM Mono, monospace', fontSize: 11 }}>
                          Last: {lastDone ? fmtFull(lastDone.toDate()) : 'Never'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      {!asset.isDeleted && (
        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, display: 'flex', gap: 8 }}>
          <button type="button" style={ftBtn} onClick={() => { onEdit(asset); onHide() }}>
            <i className="pi pi-pencil" style={{ fontSize: 12 }} /> Edit
          </button>
          <button type="button" style={ftBtn} onClick={() => setActiveTab('care')}>
            <i className="pi pi-wrench" style={{ fontSize: 12 }} /> Care
          </button>
          {onDuplicate && (
            <button type="button" style={ftIconBtn} onClick={() => { onDuplicate(asset); onHide() }} title="Duplicate">
              <i className="pi pi-copy" style={{ fontSize: 13 }} />
            </button>
          )}
          {onDelete && (
            <button type="button" style={{ ...ftIconBtn, border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444' }} onClick={() => { onDelete(asset); onHide() }} title="Archive">
              <i className="pi pi-trash" style={{ fontSize: 13 }} />
            </button>
          )}
        </div>
      )}
    </Sidebar>

    {/* ── Log Service Modal ────────────────────────────────── */}
    <Dialog
      visible={showLogModal}
      onHide={() => setShowLogModal(false)}
      blockScroll
      draggable={false}
      resizable={false}
      style={{ width: '560px' }}
      header={
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'rgba(255,255,255,0.92)' }}>
            🔧 Log Service — {asset.name}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 3 }}>
            {cat?.name ?? '—'} · {asset.location || '—'}
          </div>
        </div>
      }
      footer={
        <button
          type="button"
          onClick={() => setShowLogModal(false)}
          style={{ padding: '8px 18px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}
        >
          Close
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Per-task cards */}
        {careTasks.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>No care tasks defined for this category.</p>
        )}
        {careTasks.map(task => {
          const lastDone  = asset.careCompletions?.[task.id]
          const freq      = FREQ_BADGE[task.freq] ?? FREQ_BADGE.monthly
          const dateVal   = taskDates[task.id] ?? today
          return (
            <div key={task.id} style={{ background: 'var(--surface-section)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 14px' }}>
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 700, letterSpacing: '0.5px', background: freq.bg, color: freq.color, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  {task.freq}
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, flex: 1, color: 'rgba(255,255,255,0.88)' }}>{task.task}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
                  {lastDone ? `Last: ${lastDone.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Never logged'}
                </span>
              </div>
              {/* Date + Mark Done */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="date"
                  value={dateVal}
                  onChange={e => setTaskDates(prev => ({ ...prev, [task.id]: e.target.value }))}
                  style={{ flex: 1, background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '7px 10px', color: 'var(--text-color)', fontFamily: 'inherit', fontSize: 13, outline: 'none', colorScheme: 'dark' as const }}
                />
                <button
                  type="button"
                  disabled={loggingTask === task.id}
                  onClick={async () => {
                    setLoggingTask(task.id)
                    const d = new Date(dateVal + 'T00:00:00')
                    await assetService.logCare(asset.id, task.id, Timestamp.fromDate(d))
                    setLoggingTask(null)
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'var(--primary-color)', border: 'none', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: loggingTask === task.id ? 'not-allowed' : 'pointer', opacity: loggingTask === task.id ? 0.5 : 1, whiteSpace: 'nowrap' }}
                >
                  {loggingTask === task.id
                    ? <><i className="pi pi-spin pi-spinner" style={{ fontSize: 12 }} /> Saving…</>
                    : <>✓ Mark Done</>}
                </button>
              </div>
            </div>
          )
        })}

        {/* Custom task */}
        <div style={{ paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
            Custom Task (one-off)
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={customTask}
              onChange={e => setCustomTask(e.target.value)}
              placeholder="e.g. Replaced belt"
              style={{ flex: 1, background: 'var(--surface-section)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '7px 12px', color: 'var(--text-color)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(79,143,255,0.5)')}
              onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
            />
            <button
              type="button"
              disabled={!customTask.trim() || loggingCustom}
              onClick={async () => {
                if (!customTask.trim()) return
                setLoggingCustom(true)
                const key = `custom_${customTask.trim().replace(/[^a-z0-9]/gi, '_')}_${Date.now()}`
                await assetService.logCare(asset.id, key, Timestamp.fromDate(new Date()))
                setCustomTask('')
                setLoggingCustom(false)
              }}
              style={{ padding: '7px 14px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', fontFamily: 'inherit', fontSize: 13, cursor: !customTask.trim() || loggingCustom ? 'not-allowed' : 'pointer', opacity: !customTask.trim() || loggingCustom ? 0.4 : 1, whiteSpace: 'nowrap' }}
            >
              {loggingCustom ? '…' : '+ Log'}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
    </>
  )
}

export default AssetDetailPanel
