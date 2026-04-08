import React, { useMemo, useState, useEffect } from 'react'
import { useAssets } from '../../assets/hooks/useAssets'
import { useWorkOrders } from '../../workOrders/hooks/useWorkOrders'
import { useCategories } from '../../categories/hooks/useCategories'
import { getLifespanPercent } from '../../assets/types/asset.types'
import { useTopbarTitle } from '../../../contexts/TopbarContext'
import { useAuth } from '../../../contexts/AuthContext'
import { useScheduledReports } from '../hooks/useScheduledReports'
import { scheduledReportService } from '../services/scheduledReportService'
import { REPORT_TYPE_LABELS, FREQ_LABELS, type ReportType, type ReportFrequency } from '../types/scheduledReport.types'

// ── Shared card style ────────────────────────────────────────────────
const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--surface-card)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  ...extra,
})

const panelLabelStyle: React.CSSProperties = {
  fontFamily: 'monospace', fontSize: 10, letterSpacing: '2px',
  textTransform: 'uppercase', color: 'var(--text-color-secondary)',
  fontWeight: 500, marginBottom: 14,
}

const fmt$k = (n: number) => {
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'k'
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

// ── Simple horizontal bar row ────────────────────────────────────────
const HRow = ({ label, icon, value, max, color, suffix = '', extraLabel }: {
  label: string; icon?: string; value: number; max: number; color: string; suffix?: string; extraLabel?: string
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 110, flexShrink: 0 }}>
      {icon && <i className={icon} style={{ fontSize: 12, color: 'var(--text-color-secondary)', flexShrink: 0 }} />}
      <span style={{ fontSize: 12, color: 'var(--text-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
    </div>
    <div style={{ flex: 1, height: 7, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: max > 0 && value > 0 ? `${Math.max((value / max) * 100, 4)}%` : '0%',
        background: color, borderRadius: 99, transition: 'width 0.4s ease',
      }} />
    </div>
    <div style={{ width: 32, textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-color)', flexShrink: 0 }}>
      {extraLabel ?? (value + suffix)}
    </div>
  </div>
)

const ReportsPage = () => {
  const { setTitle, clearTitle } = useTopbarTitle()
  const { assets }     = useAssets()
  const { workOrders } = useWorkOrders()
  const { categories } = useCategories()

  useEffect(() => { setTitle('Reports'); return clearTitle }, [])

  const { userProfile } = useAuth()
  const { reports: savedReports } = useScheduledReports()

  const [schedType,   setSchedType]   = useState<ReportType>('asset_summary')
  const [schedFreq,   setSchedFreq]   = useState<ReportFrequency>('weekly')
  const [schedEmail,  setSchedEmail]  = useState('')
  const [saving,      setSaving]      = useState(false)
  const [scheduled,   setScheduled]   = useState(false)
  const [emailError,  setEmailError]  = useState('')
  const [deletingId,  setDeletingId]  = useState<string | null>(null)

  const activeAssets = useMemo(() => assets.filter(a => !a.isDeleted), [assets])

  // ── Assets by category ─────────────────────────────────────────────
  const assetsByCategory = useMemo(() =>
    categories.map(cat => ({
      name: cat.name, icon: cat.icon,
      count: activeAssets.filter(a => a.categoryId === cat.id).length,
    })).filter(c => c.count > 0).sort((a, b) => b.count - a.count),
    [categories, activeAssets])
  const maxCat = Math.max(...assetsByCategory.map(c => c.count), 1)

  // ── Status distribution ────────────────────────────────────────────
  const statusRows = useMemo(() => [
    { label: 'Active',      count: activeAssets.filter(a => a.status === 'active').length,      color: '#22c55e' },
    { label: 'Maintenance', count: activeAssets.filter(a => a.status === 'maintenance').length, color: '#f59e0b' },
    { label: 'Storage',     count: activeAssets.filter(a => a.status === 'storage').length,     color: '#94a3b8' },
    { label: 'Retired',     count: activeAssets.filter(a => a.status === 'retired').length,     color: '#ef4444' },
  ], [activeAssets])
  const maxStatus = Math.max(...statusRows.map(s => s.count), 1)

  // ── Lifespan buckets ───────────────────────────────────────────────
  const lifespanBuckets = useMemo(() => {
    const buckets = [
      { label: '< 25%',   min: 0,    max: 0.25, color: '#22c55e', count: 0 },
      { label: '25–50%',  min: 0.25, max: 0.5,  color: '#22c55e', count: 0 },
      { label: '50–75%',  min: 0.5,  max: 0.75, color: '#f59e0b', count: 0 },
      { label: '75–90%',  min: 0.75, max: 0.9,  color: '#f97316', count: 0 },
      { label: '> 90%',   min: 0.9,  max: 1.01, color: '#ef4444', count: 0 },
    ]
    activeAssets.forEach(a => {
      const pct = getLifespanPercent(a.purchaseDate, a.lifespanYears)
      const b = buckets.find(b => pct >= b.min && pct < b.max)
      if (b) b.count++
    })
    return buckets
  }, [activeAssets])
  const maxBucket = Math.max(...lifespanBuckets.map(b => b.count), 1)

  // ── Asset value by category (top 6) ────────────────────────────────
  const valueByCategory = useMemo(() =>
    categories.map(cat => ({
      name: cat.name,
      value: activeAssets.filter(a => a.categoryId === cat.id).reduce((s, a) => s + (a.purchasePrice ?? 0), 0),
    })).filter(c => c.value > 0).sort((a, b) => b.value - a.value).slice(0, 6),
    [categories, activeAssets])
  const maxValue = Math.max(...valueByCategory.map(c => c.value), 1)

  // ── Work order summary ─────────────────────────────────────────────
  const woRows = useMemo(() => [
    { label: 'Open',        count: workOrders.filter(w => w.status === 'open').length,        color: '#4f8fff' },
    { label: 'In Progress', count: workOrders.filter(w => w.status === 'inprogress').length, color: '#f59e0b' },
    { label: 'Completed',   count: workOrders.filter(w => w.status === 'completed').length,   color: '#22c55e' },
    { label: 'Onhold',      count: workOrders.filter(w => w.status === 'onhold').length,      color: '#94a3b8' },
    { label: 'Cancelled',   count: workOrders.filter(w => w.status === 'cancelled').length,   color: '#64748b' },
  ], [workOrders])
  const maxWO = Math.max(...woRows.map(w => w.count), 1)

  // ── Exports ────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Name', 'Category', 'Status', 'Serial', 'Asset Tag', 'Purchase Date', 'Purchase Price', 'Lifespan (yrs)', 'Location', 'Assigned To']
    const rows = activeAssets.map(a => [
      a.name, a.categoryId, a.status, a.serialNumber, a.assetTag,
      a.purchaseDate?.toDate().toLocaleDateString('en-US') ?? '',
      a.purchasePrice, a.lifespanYears, a.location, a.assignedTo,
    ])
    const csv  = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'assets_report.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const exportJSON = () => {
    const data = activeAssets.map(a => ({
      id: a.id, name: a.name, category: categories.find(c => c.id === a.categoryId)?.name ?? '',
      status: a.status, serial: a.serialNumber, assetTag: a.assetTag, location: a.location,
      purchasePrice: a.purchasePrice, lifespanYears: a.lifespanYears,
    }))
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'assets_report.json'; a.click()
    URL.revokeObjectURL(url)
  }

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  const handleSchedule = async () => {
    if (!schedEmail.trim()) { setEmailError('Email is required.'); return }
    if (!validateEmail(schedEmail)) { setEmailError('Enter a valid email address.'); return }
    setEmailError('')
    setSaving(true)
    const ok = await scheduledReportService.create({
      reportType: schedType,
      frequency: schedFreq,
      recipientEmail: schedEmail.trim().toLowerCase(),
      createdBy: userProfile?.uid ?? 'unknown',
    })
    setSaving(false)
    if (ok) {
      setScheduled(true)
      setSchedEmail('')
      setTimeout(() => setScheduled(false), 4000)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    await scheduledReportService.delete(id)
    setDeletingId(null)
  }

  // ── Shared input/select style ──────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    background: 'var(--surface-ground)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '10px 14px', color: 'var(--text-color)',
    fontSize: 13, fontFamily: 'inherit', outline: 'none', colorScheme: 'dark', width: '100%',
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-column gap-4">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 24, letterSpacing: '-0.3px', color: 'var(--text-color)' }}>
            📊 Reports &amp; Analytics
          </div>
          <div style={{ fontSize: 13, marginTop: 4, color: 'var(--text-color-secondary)' }}>
            Custom dashboards, asset analytics, and automated scheduled reports
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {[{ label: 'Export CSV', fn: exportCSV }, { label: 'Export JSON', fn: exportJSON }].map(b => (
            <button key={b.label} onClick={b.fn} style={{
              background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, padding: '7px 14px', color: 'var(--text-color)',
              fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <i className="pi pi-download" style={{ fontSize: 12 }} />
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1 — 3 equal panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

        {/* Assets by Category */}
        <div style={card({ padding: 20 })}>
          <div style={panelLabelStyle}>Assets by Category · All Schools</div>
          {assetsByCategory.length === 0
            ? <div style={{ fontSize: 12, color: 'var(--text-color-secondary)', textAlign: 'center', paddingTop: 20 }}>No data yet.</div>
            : assetsByCategory.map(c => (
                <HRow key={c.name} label={c.name} icon={c.icon} value={c.count} max={maxCat} color="#4f8fff" />
              ))
          }
        </div>

        {/* Status Distribution */}
        <div style={card({ padding: 20 })}>
          <div style={panelLabelStyle}>Status Distribution · All Schools</div>
          {statusRows.map(s => (
            <HRow key={s.label} label={s.label} value={s.count} max={maxStatus} color={s.color} />
          ))}
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-color-secondary)' }}>
            {activeAssets.length} total assets
          </div>
        </div>

        {/* Lifespan Usage Buckets */}
        <div style={card({ padding: 20 })}>
          <div style={panelLabelStyle}>Lifespan Usage Buckets</div>
          {lifespanBuckets.map(b => (
            <HRow key={b.label} label={b.label} value={b.count} max={maxBucket} color={b.color} />
          ))}
        </div>
      </div>

      {/* Row 2 — 2 panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Asset Value by Category (Top 6) — 2-column inner layout */}
        <div style={card({ padding: 20 })}>
          <div style={panelLabelStyle}>Asset Value by Category (Top 6) · All Schools</div>
          {valueByCategory.length === 0
            ? <div style={{ fontSize: 12, color: 'var(--text-color-secondary)' }}>No data yet.</div>
            : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                {valueByCategory.map(c => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-color)', width: 90, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name}
                    </span>
                    <div style={{ flex: 1, height: 7, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.max((c.value / maxValue) * 100, 4)}%`, background: '#7c3aed', borderRadius: 99, transition: 'width 0.4s ease' }} />
                    </div>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-color)', flexShrink: 0, width: 44, textAlign: 'right' }}>
                      {fmt$k(c.value)}
                    </span>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* Work Order Summary */}
        <div style={card({ padding: 20 })}>
          <div style={panelLabelStyle}>Work Order Summary</div>
          {woRows.map(w => (
            <HRow key={w.label} label={w.label} value={w.count} max={maxWO} color={w.color} />
          ))}
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-color-secondary)' }}>
            {workOrders.length} total work orders
          </div>
        </div>
      </div>

      {/* Scheduled Report Delivery */}
      <div style={card({ padding: 24 })}>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-color)', marginBottom: 6 }}>
          📅 Scheduled Report Delivery
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-color-secondary)', marginBottom: 20 }}>
          Set up automated report delivery to your inbox or team channel. Configure frequency and recipients below.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ ...panelLabelStyle, marginBottom: 8 }}>Report Type</div>
            <select value={schedType} onChange={e => setSchedType(e.target.value as ReportType)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {Object.entries(REPORT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <div style={{ ...panelLabelStyle, marginBottom: 8 }}>Frequency</div>
            <select value={schedFreq} onChange={e => setSchedFreq(e.target.value as ReportFrequency)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {Object.entries(FREQ_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <div style={{ ...panelLabelStyle, marginBottom: 8 }}>Recipient Email</div>
            <input
              type="email"
              value={schedEmail}
              onChange={e => { setSchedEmail(e.target.value); setEmailError('') }}
              onKeyDown={e => { if (e.key === 'Enter') handleSchedule() }}
              placeholder="admin@yourorg.com"
              style={{ ...inputStyle, borderColor: emailError ? 'rgba(239,68,68,0.5)' : undefined }}
            />
            {emailError && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{emailError}</div>}
          </div>
        </div>

        <button
          onClick={handleSchedule}
          disabled={saving}
          style={{
            background: 'var(--primary-color)', border: 'none', borderRadius: 8,
            padding: '10px 20px', color: '#fff', fontSize: 13, fontFamily: 'inherit',
            fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            opacity: saving ? 0.7 : 1, transition: 'opacity 0.15s',
          }}
        >
          {saving
            ? <><i className="pi pi-spin pi-spinner" style={{ fontSize: 13 }} /> Saving…</>
            : <><i className="pi pi-calendar" style={{ fontSize: 13 }} /> Schedule Report</>
          }
        </button>

        {scheduled && (
          <div style={{
            marginTop: 14, padding: '10px 16px', borderRadius: 8,
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
            fontSize: 13, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <i className="pi pi-check-circle" />
            Scheduled! A {FREQ_LABELS[schedFreq]} {REPORT_TYPE_LABELS[schedType]} report will be sent automatically.
          </div>
        )}

        {/* Active schedules list */}
        {savedReports.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ ...panelLabelStyle, marginBottom: 12 }}>Active Schedules</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {savedReports.map(r => {
                const nextDate = r.nextSendAt
                  ? (() => { try { return r.nextSendAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return '—' } })()
                  : '—'
                const lastDate = r.lastSentAt
                  ? (() => { try { return r.lastSentAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return '—' } })()
                  : 'Never sent'
                return (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <i className="pi pi-calendar" style={{ fontSize: 14, color: 'var(--primary-color)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-color)' }}>
                        {REPORT_TYPE_LABELS[r.reportType]}
                        <span style={{ marginLeft: 8, fontSize: 11, fontFamily: 'monospace', color: 'var(--primary-color)', background: 'rgba(79,143,255,0.12)', padding: '1px 7px', borderRadius: 99 }}>
                          {FREQ_LABELS[r.frequency]}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-color-secondary)', marginTop: 2 }}>
                        → {r.recipientEmail} · Next: {nextDate} · Last: {lastDate}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={deletingId === r.id}
                      style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: '#ef4444', padding: 6, borderRadius: 6, flexShrink: 0,
                        opacity: deletingId === r.id ? 0.4 : 1,
                      }}
                    >
                      {deletingId === r.id
                        ? <i className="pi pi-spin pi-spinner" style={{ fontSize: 13 }} />
                        : <i className="pi pi-trash" style={{ fontSize: 13 }} />
                      }
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

export default ReportsPage
