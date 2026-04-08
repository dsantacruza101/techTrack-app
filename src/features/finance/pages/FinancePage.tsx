import React, { useMemo, useEffect } from 'react'
import { useAssets } from '../../assets/hooks/useAssets'
import { useCategories } from '../../categories/hooks/useCategories'
import { getLifespanPercent } from '../../assets/types/asset.types'
import { useTopbarTitle } from '../../../contexts/TopbarContext'

// ── Shared card style (matches Analytics) ───────────────────────────
const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--surface-card)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  ...extra,
})

const SCHOOL_COLORS = [
  { bg: 'rgba(79,143,255,0.15)',  text: '#4f8fff' },
  { bg: 'rgba(6,182,212,0.15)',   text: '#06b6d4' },
  { bg: 'rgba(124,58,237,0.15)', text: '#a78bfa' },
  { bg: 'rgba(34,197,94,0.15)',   text: '#22c55e' },
  { bg: 'rgba(249,115,22,0.15)', text: '#f97316' },
  { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
]
const schoolColor = (name: string) => {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return SCHOOL_COLORS[h % SCHOOL_COLORS.length]
}

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string; label: string }> = {
  active:      { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e', border: 'rgba(34,197,94,0.4)',   label: '• active'  },
  maintenance: { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', border: 'rgba(245,158,11,0.4)',  label: '• maint.'  },
  storage:     { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8', border: 'rgba(148,163,184,0.4)', label: '• storage' },
  retired:     { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', border: 'rgba(239,68,68,0.4)',   label: '• retired' },
}

const fmt$ = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const thStyle: React.CSSProperties = {
  padding: '10px 16px', textAlign: 'left',
  fontFamily: 'monospace', fontSize: 10, letterSpacing: '1.5px',
  textTransform: 'uppercase', color: 'var(--text-color-secondary)',
  whiteSpace: 'nowrap', fontWeight: 500,
}

const FinancePage = () => {
  const { setTitle, clearTitle } = useTopbarTitle()
  const { assets }     = useAssets()
  useCategories()

  useEffect(() => { setTitle('Finance & Depreciation'); return clearTitle }, [])

  const activeAssets = useMemo(() => assets.filter(a => !a.isDeleted), [assets])

  // ── Metrics ────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    let totalPurchase = 0, totalDeprAmount = 0, totalAgeYrs = 0, ageCount = 0
    activeAssets.forEach(a => {
      const pct = getLifespanPercent(a.purchaseDate, a.lifespanYears)
      totalPurchase    += a.purchasePrice ?? 0
      totalDeprAmount  += (a.purchasePrice ?? 0) * pct
      if (a.purchaseDate) {
        try {
          const yrs = (Date.now() - a.purchaseDate.toDate().getTime()) / (365.25 * 24 * 60 * 60 * 1000)
          if (yrs >= 0) { totalAgeYrs += yrs; ageCount++ }
        } catch { /* skip */ }
      }
    })
    return {
      totalPurchase,
      currentBookValue: totalPurchase - totalDeprAmount,
      totalDeprAmount,
      avgAge: ageCount > 0 ? totalAgeYrs / ageCount : 0,
    }
  }, [activeAssets])

  // ── Table rows ─────────────────────────────────────────────────────
  const rows = useMemo(() => activeAssets.map(a => {
    const pct       = getLifespanPercent(a.purchaseDate, a.lifespanYears)
    const deprAmt   = (a.purchasePrice ?? 0) * pct
    const bookValue = Math.max((a.purchasePrice ?? 0) - deprAmt, 0)
    const deprPerYr = a.lifespanYears > 0 ? (a.purchasePrice ?? 0) / a.lifespanYears : 0
    let ageYrs = 0
    if (a.purchaseDate) {
      try { ageYrs = (Date.now() - a.purchaseDate.toDate().getTime()) / (365.25 * 24 * 60 * 60 * 1000) }
      catch { /* skip */ }
    }
    return { a, pct, bookValue, deprPerYr, ageYrs }
  }).sort((x, y) => (y.a.purchasePrice ?? 0) - (x.a.purchasePrice ?? 0)), [activeAssets])

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-column gap-4">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 24, letterSpacing: '-0.3px', color: 'var(--text-color)' }}>
            💰 Finance &amp; Depreciation
          </div>
          <div style={{ fontSize: 13, marginTop: 4, color: 'var(--text-color-secondary)' }}>
            Track asset depreciation (straight-line), current book values, and inventory costs.
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid">
        {[
          { label: 'TOTAL PURCHASE VALUE', value: fmt$(metrics.totalPurchase),    color: 'var(--tt-accent)'  },
          { label: 'CURRENT BOOK VALUE',   value: fmt$(metrics.currentBookValue), color: 'var(--tt-green)'   },
          { label: 'TOTAL DEPRECIATION',   value: fmt$(metrics.totalDeprAmount),  color: 'var(--tt-yellow)'  },
          { label: 'AVERAGE ASSET AGE',    value: metrics.avgAge.toFixed(1) + 'yr', color: '#06b6d4'         },
        ].map(m => (
          <div key={m.label} className="col-3">
            <div style={{ ...card({ padding: 20, position: 'relative', overflow: 'hidden', borderTop: `3px solid ${m.color}` }) }}>
              <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700, fontSize: 36, color: m.color, lineHeight: 1.1 }}>
                {m.value}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-color-secondary)', marginTop: 4 }}>
                {m.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={card({ overflow: 'hidden' })}>
        {rows.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--text-color-secondary)' }}>
            No assets with financial data found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['ASSET', 'SCHOOL', 'PURCHASE VALUE', 'AGE', 'LIFESPAN', 'DEPRECIATION/YR', 'BOOK VALUE', 'DEPR. PROGRESS', 'STATUS'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ a, pct, bookValue, deprPerYr, ageYrs }, i) => {
                  const st      = STATUS_STYLE[a.status] ?? STATUS_STYLE.active
                  const sc      = schoolColor(a.school ?? '')
                  const deprPct = Math.round(pct * 100)
                  return (
                    <tr key={a.id} style={{ borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>

                      <td style={{ padding: '12px 16px', minWidth: 180 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-color)' }}>{a.name}</div>
                        {a.assetTag && <div style={{ fontSize: 11, fontFamily: 'monospace', marginTop: 2, color: 'var(--text-color-secondary)' }}>{a.assetTag}</div>}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        {a.school ? (
                          <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.text }}>
                            {a.school}
                          </span>
                        ) : <span style={{ fontSize: 11, color: 'var(--text-color-secondary)' }}>—</span>}
                      </td>

                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: 'var(--text-color)' }}>
                        {a.purchasePrice ? fmt$(a.purchasePrice) : '—'}
                      </td>

                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: 'var(--text-color-secondary)' }}>
                        {ageYrs > 0 ? ageYrs.toFixed(1) + ' yr' : '—'}
                      </td>

                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: 'var(--text-color-secondary)' }}>
                        {a.lifespanYears ? a.lifespanYears + ' yr' : '—'}
                      </td>

                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: '#f59e0b' }}>
                        {deprPerYr > 0 ? fmt$(deprPerYr) + '/yr' : '—'}
                      </td>

                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: '#22c55e' }}>
                        {a.purchasePrice ? fmt$(bookValue) : '—'}
                      </td>

                      <td style={{ padding: '12px 16px', minWidth: 160 }}>
                        <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden', marginBottom: 5 }}>
                          <div style={{ height: '100%', width: `${deprPct}%`, borderRadius: 99, background: '#7c3aed', transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-color-secondary)' }}>
                          {deprPct}% deprecated
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color, border: `1px solid ${st.border}`, whiteSpace: 'nowrap' }}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Depreciation Method Legend */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-color-secondary)', marginBottom: 6 }}>
            Depreciation Method
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-color-secondary)' }}>
            <i className="pi pi-arrow-down-right" style={{ fontSize: 13, color: 'var(--text-color)' }} />
            <span>
              <strong style={{ color: 'var(--text-color)' }}>Straight-Line</strong>
              {' — (Purchase Value ÷ Lifespan Years) = Annual Depreciation. Book Value = Purchase Value − (Annual Depr. × Years Used). Salvage value assumed $0.'}
            </span>
          </div>
        </div>
      </div>

    </div>
  )
}

export default FinancePage
