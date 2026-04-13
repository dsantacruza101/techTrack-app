import React, { useMemo, useState, useEffect } from 'react'
import { useAssets } from '../../assets/hooks/useAssets'
import { useWorkOrders } from '../../workOrders/hooks/useWorkOrders'
import { useCategories } from '../../categories/hooks/useCategories'
import { getLifespanPercent } from '../../assets/types/asset.types'
import { useTopbarTitle } from '../../../contexts/TopbarContext'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const LABOR_PER_TASK_HRS = 0.75

// ── Vertical bar chart ───────────────────────────────────────────────
const BarChart = ({ data, color }: { data: { label: string; value: number }[]; color: string }) => {
  const max = Math.max(...data.map(d => d.value), 1)
  const BAR_H = 120
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: BAR_H + 20, paddingTop: 8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
          <div style={{
            width: '100%',
            height: d.value > 0 ? `${Math.max((d.value / max) * BAR_H, 4)}px` : '2px',
            background: d.value > 0 ? color : 'var(--surface-border)',
            borderRadius: '3px 3px 0 0',
            transition: 'height 0.4s ease',
            opacity: 0.85,
          }} />
          <div style={{ fontSize: 9, color: 'var(--text-color-secondary)', marginTop: 4, fontFamily: 'monospace', textAlign: 'center' }}>
            {d.label}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Horizontal bar row ───────────────────────────────────────────────
const HBar = ({ label, icon, value, max, color, suffix }: {
  label: string; icon: string; value: number; max: number; color: string; suffix: string
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
    <div style={{ width: 110, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      <i className={icon} style={{ fontSize: 12, color: 'var(--text-color-secondary)', flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: 'var(--text-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
    </div>
    <div style={{ flex: 1, height: 8, background: 'var(--surface-border)', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: max > 0 ? `${Math.max((value / max) * 100, value > 0 ? 4 : 0)}%` : '0%',
        background: color,
        borderRadius: 99,
        transition: 'width 0.4s ease',
      }} />
    </div>
    <div style={{ width: 36, textAlign: 'right', fontSize: 12, fontFamily: 'monospace', color, fontWeight: 600, flexShrink: 0 }}>
      {value}{suffix}
    </div>
  </div>
)

const AnalyticsPage = () => {
  const { setTitle, clearTitle } = useTopbarTitle()
  const { assets }     = useAssets()
  const { workOrders } = useWorkOrders()
  const { categories } = useCategories()
  const [period, setPeriod] = useState(365)

  useEffect(() => { setTitle('Analytics'); return clearTitle }, [])

  const now    = Date.now()
  const cutoff = now - period * 86_400_000

  const activeAssets = useMemo(() => assets.filter(a => !a.isDeleted), [assets])

  const recentWOs = useMemo(() =>
    workOrders.filter(w => {
      try { return (w.createdAt?.toDate().getTime() ?? 0) > cutoff } catch { return false }
    }), [workOrders, cutoff])

  // ── Metrics ────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalMaintCost = recentWOs.reduce((s, w) => s + ((w as unknown as Record<string, number>).estimatedCost ?? 0), 0)
    const completed   = recentWOs.filter(w => w.status === 'completed').length
    const openInProg  = recentWOs.filter(w => w.status === 'open' || w.status === 'inprogress').length
    const efficiency  = recentWOs.length > 0 ? Math.round((completed / recentWOs.length) * 100) : 0
    return { totalMaintCost, completed, openInProg, efficiency }
  }, [recentWOs])

  const effLabel = metrics.efficiency >= 70 ? { text: '↑ Good standing', color: '#22c55e' }
                 : metrics.efficiency >= 40 ? { text: '→ Moderate',       color: '#f59e0b' }
                 :                            { text: '↓ Needs attention', color: '#ef4444' }

  // ── Monthly bar chart data (12 months) ─────────────────────────────
  const monthlyData = useMemo(() => {
    const nowD = new Date()
    return Array.from({ length: 12 }, (_, i) => {
      const d    = new Date(nowD.getFullYear(), nowD.getMonth() - (11 - i), 1)
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      const monthWOs = workOrders.filter(w => {
        try { const t = w.createdAt?.toDate().getTime() ?? 0; return t >= d.getTime() && t < next.getTime() }
        catch { return false }
      })
      const cost = monthWOs.reduce((s, w) => s + ((w as unknown as Record<string, number>).estimatedCost ?? 0), 0)
      return { label: MONTHS[d.getMonth()], cost, count: monthWOs.length }
    })
  }, [workOrders])

  // ── Labor hours by category ────────────────────────────────────────
  const laborByCategory = useMemo(() =>
    categories.filter(c => !c.isDeleted).map(cat => {
      const catAssets = activeAssets.filter(a => a.categoryId === cat.id)
      const taskCount = (cat.careTasks ?? []).filter(t => t.freq !== 'asneeded').length
      const hrsPerYear = catAssets.length * taskCount * LABOR_PER_TASK_HRS
      return { name: cat.name, icon: cat.icon, hrsPerYear }
    }).filter(c => c.hrsPerYear > 0).sort((a, b) => b.hrsPerYear - a.hrsPerYear),
    [categories, activeAssets])

  const maxLaborHrs = Math.max(...laborByCategory.map(c => c.hrsPerYear), 1)

  // ── Efficiency by category ─────────────────────────────────────────
  const effByCategory = useMemo(() =>
    categories.filter(c => !c.isDeleted).map(cat => {
      const catAssets = activeAssets.filter(a => a.categoryId === cat.id)
      if (!catAssets.length) return null
      const avgPct = catAssets.reduce((s, a) => s + getLifespanPercent(a.purchaseDate, a.lifespanYears), 0) / catAssets.length
      return { name: cat.name, icon: cat.icon, efficiency: Math.round((1 - avgPct) * 100) }
    }).filter(Boolean).sort((a, b) => (b!.efficiency - a!.efficiency)) as { name: string; icon: string; efficiency: number }[],
    [categories, activeAssets])

  const maxEff = Math.max(...effByCategory.map(c => c.efficiency), 1)

  // ── Breakdown table ────────────────────────────────────────────────
  const breakdown = useMemo(() =>
    categories.filter(c => !c.isDeleted).map(cat => {
      const catAssets = activeAssets.filter(a => a.categoryId === cat.id)
      if (!catAssets.length) return null
      const woCount  = workOrders.filter(w => catAssets.some(a => a.id === w.assetId)).length
      const estCost  = workOrders.filter(w => catAssets.some(a => a.id === w.assetId))
                         .reduce((s, w) => s + ((w as unknown as Record<string, number>).estimatedCost ?? 0), 0)
      const careDue  = catAssets.reduce((s, a) => {
        const tasks = (cat.careTasks ?? []).filter(t => t.freq !== 'asneeded')
        const done  = Object.keys(a.careCompletions ?? {}).length
        return s + Math.max(tasks.length - done, 0)
      }, 0)
      const avgAge = catAssets.reduce((s, a) => {
        try { return s + (Date.now() - a.purchaseDate.toDate().getTime()) / (365.25 * 86400000) }
        catch { return s }
      }, 0) / catAssets.length
      const avgPct = catAssets.reduce((s, a) => s + getLifespanPercent(a.purchaseDate, a.lifespanYears), 0) / catAssets.length
      const efficiency = Math.round((1 - avgPct) * 100)
      return { name: cat.name, icon: cat.icon, assets: catAssets.length, woCount, estCost, careDue, avgAge, efficiency }
    }).filter(Boolean) as { name: string; icon: string; assets: number; woCount: number; estCost: number; careDue: number; avgAge: number; efficiency: number }[],
    [categories, activeAssets, workOrders])

  // ── Export ─────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = [
      ['Category', 'Assets', 'Work Orders', 'Est. Cost', 'Care Tasks Due', 'Avg Age (yr)', 'Efficiency %'],
      ...breakdown.map(r => [r.name, r.assets, r.woCount, r.estCost, r.careDue, r.avgAge.toFixed(1), r.efficiency]),
    ]
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'analytics-report.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const fmt$ = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })

  const card = (style: React.CSSProperties = {}): React.CSSProperties => ({
    background: 'var(--surface-card)',
    border: '1px solid var(--tt-border-soft)',
    borderRadius: 12,
    padding: 20,
    ...style,
  })

  const controlStyle: React.CSSProperties = {
    background: 'var(--surface-card)',
    border: '1px solid var(--tt-border)',
    borderRadius: 8,
    padding: '7px 12px',
    color: 'var(--text-color)',
    fontSize: 13,
    fontFamily: 'inherit',
    outline: 'none',
    cursor: 'pointer',
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-column gap-4">

      {/* Header */}
      <div className="flex align-items-start justify-content-between gap-3 flex-wrap">
        <div>
          <div className="font-bold text-2xl text-900" style={{ letterSpacing: '-0.3px' }}>📊 Reporting &amp; Analytics</div>
          <div className="text-sm mt-1" style={{ color: 'var(--text-color-secondary)' }}>
            Maintenance costs, labor hours, operational efficiency, and performance trends
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={period}
            onChange={e => setPeriod(Number(e.target.value))}
            style={controlStyle}
          >
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 3 months</option>
            <option value={180}>Last 6 months</option>
            <option value={365}>Last 12 months</option>
          </select>
          <button onClick={handleExport} style={{ ...controlStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="pi pi-download" style={{ fontSize: 12 }} />
            Export Report
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid">
        {[
          { label: 'TOTAL MAINT. COST',  value: fmt$(metrics.totalMaintCost), sub: `from ${recentWOs.length} work orders`,        color: 'var(--tt-accent)'  },
          { label: 'COMPLETED WOs',       value: String(metrics.completed),    sub: '↑ resolved',                                  subColor: '#22c55e', color: 'var(--tt-green)'   },
          { label: 'OPEN / IN PROGRESS',  value: String(metrics.openInProg),   sub: 'work orders',                                 color: 'var(--tt-yellow)'  },
          { label: 'EFFICIENCY SCORE',    value: `${metrics.efficiency}%`,     sub: effLabel.text, subColor: effLabel.color,        color: '#7c3aed'           },
        ].map(m => (
          <div key={m.label} className="col-3">
            <div style={{ ...card(), borderTop: `3px solid ${m.color}`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-color-secondary)', marginBottom: 6 }}>
                {m.label}
              </div>
              <div style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 36, color: 'var(--text-color)', lineHeight: 1.1 }}>
                {m.value}
              </div>
              <div style={{ fontSize: 12, marginTop: 4, color: (m as { subColor?: string }).subColor ?? 'var(--text-color-secondary)' }}>
                {m.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Two bar charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={card()}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: 'var(--text-color)' }}>🪄 Estimated Maintenance Cost by Month</div>
          <BarChart data={monthlyData.map(d => ({ label: d.label, value: d.cost }))} color="#4f8fff" />
        </div>
        <div style={card()}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: 'var(--text-color)' }}>🔧 Work Orders by Month</div>
          <BarChart data={monthlyData.map(d => ({ label: d.label, value: d.count }))} color="#f59e0b" />
        </div>
      </div>

      {/* Labor hours + Efficiency score */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={card()}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: 'var(--text-color)' }}>⏱ Labor Hours Estimate by Category</div>
          {laborByCategory.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--text-color-secondary)', textAlign: 'center', padding: '20px 0' }}>Add care tasks to see estimates.</div>
            : laborByCategory.map(c => (
                <HBar key={c.name} label={c.name} icon={c.icon} value={Math.round(c.hrsPerYear)}
                  max={Math.ceil(maxLaborHrs)} color="#06b6d4" suffix="h" />
              ))
          }
        </div>
        <div style={card()}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: 'var(--text-color)' }}>⚡ Operational Efficiency Score</div>
          {effByCategory.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--text-color-secondary)', textAlign: 'center', padding: '20px 0' }}>No data yet.</div>
            : effByCategory.map(c => (
                <HBar key={c.name} label={c.name} icon={c.icon} value={c.efficiency}
                  max={maxEff} color="#ef4444" suffix="%" />
              ))
          }
        </div>
      </div>

      {/* Maintenance Cost Breakdown table */}
      <div style={{ ...card({ padding: 0 }), overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--tt-border-soft)' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-color)' }}>📋 Maintenance Cost Breakdown</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--tt-border-soft)' }}>
                {['CATEGORY', 'ASSETS', 'WORK ORDERS', 'EST. COST (WOs)', 'CARE TASKS DUE', 'AVG ASSET AGE', 'EFFICIENCY'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left',
                    fontFamily: 'monospace', fontSize: 10, letterSpacing: '1.5px',
                    textTransform: 'uppercase', color: 'var(--text-color-secondary)',
                    whiteSpace: 'nowrap', fontWeight: 500,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {breakdown.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', fontSize: 13, color: 'var(--text-color-secondary)' }}>No data available yet.</td></tr>
              )}
              {breakdown.map((row, i) => (
                <tr key={row.name} style={{ borderBottom: i < breakdown.length - 1 ? '1px solid var(--tt-border-faint)' : 'none' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className={row.icon} style={{ fontSize: 14, color: 'var(--text-color-secondary)' }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-color)' }}>{row.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: 'var(--text-color)' }}>
                    {row.assets}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: 'var(--text-color)' }}>
                    {row.woCount}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: row.estCost > 0 ? '#f59e0b' : 'var(--text-color-secondary)' }}>
                    {row.estCost > 0 ? fmt$(row.estCost) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: row.careDue > 0 ? '#ef4444' : '#22c55e' }}>
                    {row.careDue}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: 'var(--text-color-secondary)' }}>
                    {row.avgAge.toFixed(1)} yr
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: '#ef4444' }}>
                    {row.efficiency}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

export default AnalyticsPage
