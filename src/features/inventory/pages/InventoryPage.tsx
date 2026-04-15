import React, { useState, useMemo, useEffect } from 'react'
import { useAssets } from '../../assets/hooks/useAssets'
import { useCategories } from '../../categories/hooks/useCategories'
import { useTopbarTitle } from '../../../contexts/TopbarContext'
import { CATEGORY_COLORS } from '../../categories/types/category.types'
import type { ColorKey } from '../../categories/types/category.types'

// ── Shared card style (matches Analytics) ───────────────────────────
const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--surface-card)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  ...extra,
})

const fmt$ = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const fmtDate = (ts: { toDate: () => Date } | null | undefined) => {
  if (!ts) return '—'
  try {
    const d = ts.toDate()
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return '—' }
}

const fmtTaskId = (id: string) =>
  id.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

interface HistoryEvent {
  key: string
  assetName: string
  location: string
  categoryId: string
  eventLabel: string
  ts: number
  dateStr: string
}

const InventoryPage = () => {
  const { setTitle, clearTitle } = useTopbarTitle()
  const { assets, loading } = useAssets()
  const { categories } = useCategories()

  useEffect(() => { setTitle('Inventory'); return clearTitle }, [])

  const [catFilter, setCatFilter] = useState('')

  const catMap = useMemo(() => {
    const m: Record<string, (typeof categories)[0]> = {}
    categories.forEach(c => { m[c.id] = c })
    return m
  }, [categories])

  const taskNameMap = useMemo(() => {
    const m: Record<string, string> = {}
    categories.forEach(c => (c.careTasks ?? []).forEach(t => { m[t.id] = t.task }))
    return m
  }, [categories])

  const activeAssets = useMemo(() => assets.filter(a => !a.isDeleted), [assets])

  const filteredAssets = useMemo(
    () => catFilter ? activeAssets.filter(a => a.categoryId === catFilter) : activeAssets,
    [activeAssets, catFilter],
  )

  // ── Metrics ────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total    = activeAssets.length
    const inStock  = activeAssets.filter(a => a.status === 'active').length
    const totalValue = activeAssets.reduce((s, a) => s + (a.purchasePrice ?? 0), 0)
    const groups: Record<string, { active: number; total: number }> = {}
    activeAssets.forEach(a => {
      const k = `${a.brand}|${a.model}|${a.categoryId}`
      if (!groups[k]) groups[k] = { active: 0, total: 0 }
      groups[k].total++
      if (a.status === 'active') groups[k].active++
    })
    const lowStock = Object.values(groups).filter(g => g.active <= 2 && g.total > 0).length
    return { total, inStock, lowStock, totalValue }
  }, [activeAssets])

  // ── Asset groups ───────────────────────────────────────────────────
  const assetGroups = useMemo(() => {
    const groups: Record<string, {
      name: string; categoryId: string; units: number;
      active: number; storage: number; maintenance: number; retired: number;
      totalValue: number
    }> = {}
    filteredAssets.forEach(a => {
      const k    = `${a.brand}|${a.model}|${a.categoryId}`
      const name = [a.brand, a.model].filter(Boolean).join(' ') || a.name
      if (!groups[k]) groups[k] = { name, categoryId: a.categoryId, units: 0, active: 0, storage: 0, maintenance: 0, retired: 0, totalValue: 0 }
      groups[k].units++
      if (a.status === 'active')           groups[k].active++
      else if (a.status === 'storage')     groups[k].storage++
      else if (a.status === 'maintenance') groups[k].maintenance++
      else if (a.status === 'retired')     groups[k].retired++
      groups[k].totalValue += a.purchasePrice ?? 0
    })
    return Object.values(groups).sort((a, b) => b.units - a.units)
  }, [filteredAssets])

  // ── History log ────────────────────────────────────────────────────
  const historyEvents = useMemo(() => {
    const events: HistoryEvent[] = []
    activeAssets.forEach(a => {
      if (a.createdAt) {
        try {
          events.push({
            key: `acq-${a.id}`,
            assetName: a.name || [a.brand, a.model].filter(Boolean).join(' ') || 'Asset',
            location: a.location || '',
            categoryId: a.categoryId,
            eventLabel: a.purchasePrice ? `Acquired: ${fmt$(a.purchasePrice)}` : 'Acquired',
            ts: a.createdAt.toDate().getTime(),
            dateStr: fmtDate(a.createdAt as unknown as { toDate: () => Date }),
          })
        } catch { /* skip */ }
      }
      if (a.careCompletions) {
        Object.entries(a.careCompletions).forEach(([taskId, completedAt]) => {
          if (!completedAt) return
          try {
            const ts = (completedAt as unknown as { toDate: () => Date }).toDate().getTime()
            events.push({
              key: `care-${a.id}-${taskId}`,
              assetName: a.name || [a.brand, a.model].filter(Boolean).join(' ') || 'Asset',
              location: a.location || '',
              categoryId: a.categoryId,
              eventLabel: `Care: ${taskNameMap[taskId] ?? fmtTaskId(taskId)}`,
              ts,
              dateStr: fmtDate(completedAt as unknown as { toDate: () => Date }),
            })
          } catch { /* skip */ }
        })
      }
    })
    return events.sort((a, b) => b.ts - a.ts).slice(0, 25)
  }, [activeAssets, taskNameMap])

  // ── Export ─────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = [
      ['Asset Name', 'Category', 'Total Units', 'Active', 'In Storage', 'Maintenance', 'Retired', 'Total Value'],
      ...assetGroups.map(g => {
        const cat = catMap[g.categoryId]
        return [g.name, cat?.name ?? '', g.units, g.active, g.storage, g.maintenance, g.retired, g.totalValue]
      }),
    ]
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'inventory-asset-report.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Shared inline styles ───────────────────────────────────────────
  const selectStyle: React.CSSProperties = {
    background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, padding: '7px 12px', color: 'var(--text-color)',
    fontSize: 13, fontFamily: 'inherit', outline: 'none', colorScheme: 'dark', cursor: 'pointer',
  }
  const btnStyle: React.CSSProperties = {
    background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, padding: '7px 14px', color: 'var(--text-color)',
    fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6,
  }
  const thStyle: React.CSSProperties = {
    padding: '10px 16px', textAlign: 'left',
    fontFamily: 'monospace', fontSize: 10, letterSpacing: '1.5px',
    textTransform: 'uppercase', color: 'var(--text-color-secondary)',
    whiteSpace: 'nowrap', fontWeight: 500,
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-column gap-4">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 24, letterSpacing: '-0.3px', color: 'var(--text-color)' }}>
            📦 Inventory &amp; Asset Management
          </div>
          <div style={{ fontSize: 13, marginTop: 4, color: 'var(--text-color-secondary)' }}>
            Real-time stock levels, usage history, and detailed asset lifecycle tracking
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ ...selectStyle, minWidth: 160 }}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button style={btnStyle} onClick={handleExport}>
            <i className="pi pi-upload" style={{ fontSize: 12 }} />
            Export
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid">
        {[
          { label: 'TOTAL ITEMS',  value: String(metrics.total),       sub: 'all inventory',     color: 'var(--tt-accent)'  },
          { label: 'IN STOCK',     value: String(metrics.inStock),     sub: 'active assets',     color: 'var(--tt-green)'   },
          { label: 'LOW STOCK',    value: String(metrics.lowStock),    sub: '≤2 units per type', color: 'var(--tt-yellow)'  },
          { label: 'TOTAL VALUE',  value: fmt$(metrics.totalValue),    sub: 'purchase cost',     color: 'var(--tt-accent)'  },
        ].map(m => (
          <div key={m.label} className="col-3">
            <div style={{ ...card({ padding: 20, position: 'relative', overflow: 'hidden', borderTop: `3px solid ${m.color}` }) }}>
              <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700, fontSize: 36, color: m.color, lineHeight: 1.1 }}>
                {m.value}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-color-secondary)', marginTop: 4 }}>
                {m.label}
              </div>
              <div style={{ fontSize: 12, marginTop: 2, color: 'var(--text-color-secondary)' }}>{m.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="tt-with-panel" style={{ gridTemplateColumns: '1fr 320px' }}>

        {/* Stock Levels Table */}
        <div style={card({ overflow: 'hidden' })}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-color)' }}>Stock Levels by Asset Type</div>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <i className="pi pi-spin pi-spinner text-2xl" style={{ color: 'var(--text-color-secondary)' }} />
            </div>
          ) : assetGroups.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--text-color-secondary)' }}>
              No assets found{catFilter ? ' in this category' : ''}.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {['ITEM / ASSET GROUP', 'CATEGORY', 'UNITS', 'ACTIVE', 'IN STORAGE', 'MAINTENANCE', 'STOCK LEVEL', 'TOTAL VALUE'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assetGroups.map((g, i) => {
                    const cat      = catMap[g.categoryId]
                    const clr      = cat ? (CATEGORY_COLORS[cat.colorKey as ColorKey] ?? CATEGORY_COLORS.blue) : CATEGORY_COLORS.blue
                    const pct      = g.units > 0 ? (g.active / g.units) * 100 : 0
                    const barColor = pct >= 80 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444'
                    return (
                      <tr key={i} style={{ borderBottom: i < assetGroups.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                        <td style={{ padding: '12px 16px', minWidth: 160 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-color)' }}>{g.name}</div>
                          {cat && <div style={{ fontSize: 11, marginTop: 2, color: 'var(--text-color-secondary)' }}>{cat.name}</div>}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {cat ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: clr.bg, color: clr.text }}>
                              {cat.name}
                            </span>
                          ) : <span style={{ fontSize: 11, color: 'var(--text-color-secondary)' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'var(--text-color)' }}>{g.units}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: '#22c55e' }}>{g.active}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: 'var(--text-color-secondary)' }}>{g.storage}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: '#f59e0b' }}>{g.maintenance}</td>
                        <td style={{ padding: '12px 16px', minWidth: 140 }}>
                          <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
                            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: barColor, transition: 'width 0.3s' }} />
                          </div>
                          <span style={{ fontSize: 11, fontFamily: 'monospace', color: barColor }}>{Math.round(pct)}% active</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: 'var(--text-color)' }}>{fmt$(g.totalValue)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Asset History Log */}
        <div style={card({ overflow: 'hidden' })}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-color)' }}>Asset History Log</div>
          </div>
          {historyEvents.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--text-color-secondary)' }}>
              No history available yet.
            </div>
          ) : (
            <div style={{ overflowY: 'auto', maxHeight: 520 }}>
              {historyEvents.map((ev, i) => {
                const cat   = catMap[ev.categoryId]
                const color = cat ? (CATEGORY_COLORS[cat.colorKey as ColorKey]?.swatch ?? '#4f8fff') : '#4f8fff'
                return (
                  <div key={ev.key} style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10, borderBottom: i < historyEvents.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <div style={{ marginTop: 5, flexShrink: 0, width: 8, height: 8, borderRadius: '50%', background: color }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-color)', wordBreak: 'break-word' }}>
                        {ev.assetName}{ev.location ? ` — ${ev.location}` : ''}
                      </div>
                      <div style={{ fontSize: 11, marginTop: 2, color: 'var(--text-color-secondary)' }}>{ev.eventLabel}</div>
                      <div style={{ fontSize: 10, marginTop: 3, fontFamily: 'monospace', color: 'var(--text-color-secondary)', opacity: 0.7 }}>{ev.dateStr}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default InventoryPage
