import { useState, useMemo, useEffect } from 'react'
import { Dialog } from 'primereact/dialog'
import { Timestamp } from 'firebase/firestore'
import { useAssets } from '../../assets/hooks/useAssets'
import { useCategories } from '../../categories/hooks/useCategories'
import { assetService } from '../../assets/services/assetService'
import { CATEGORY_COLORS, type CareTask } from '../../categories/types/category.types'
import type { ColorKey } from '../../categories/types/category.types'
import type { Asset } from '../../assets/types/asset.types'
import { useTopbarTitle } from '../../../contexts/TopbarContext'

type CareFilter = 'all' | 'overdue' | 'soon' | 'ok'

const msPerDay = 86_400_000

const getNextDue = (lastDate: Date | null, freq: string): Date => {
  const base = lastDate ?? new Date(0)
  const next = new Date(base)
  switch (freq) {
    case 'daily':     next.setDate(next.getDate() + 1);       break
    case 'weekly':    next.setDate(next.getDate() + 7);       break
    case 'monthly':   next.setMonth(next.getMonth() + 1);     break
    case 'quarterly': next.setMonth(next.getMonth() + 3);     break
    case 'annually':  next.setFullYear(next.getFullYear() + 1); break
    default:          next.setFullYear(next.getFullYear() + 1); break
  }
  return next
}

const dueStatus = (nextDue: Date): 'overdue' | 'soon' | 'ok' => {
  const days = (nextDue.getTime() - Date.now()) / msPerDay
  if (days < 0)   return 'overdue'
  if (days <= 14) return 'soon'
  return 'ok'
}

const FREQ_STYLE: Record<string, { bg: string; color: string }> = {
  daily:     { bg: 'rgba(34,197,94,0.15)',   color: '#4ade80' },
  weekly:    { bg: 'rgba(79,143,255,0.15)',  color: '#4f8fff' },
  monthly:   { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24' },
  quarterly: { bg: 'rgba(249,115,22,0.15)',  color: '#fb923c' },
  annually:  { bg: 'rgba(124,58,237,0.15)',  color: '#a78bfa' },
  asneeded:  { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
}

const STATUS_PILL: Record<'overdue' | 'soon' | 'ok', { bg: string; color: string; label: string }> = {
  overdue: { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444', label: 'OVERDUE'  },
  soon:    { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'DUE SOON' },
  ok:      { bg: 'rgba(34,197,94,0.15)',  color: '#22c55e', label: 'OK'       },
}

interface AssetGroup {
  asset:       Asset
  catName:     string
  catIcon:     string
  catColorKey: string
  subcategory: string
  tasks: { task: CareTask; lastDone: Date | null; nextDue: Date; status: 'overdue' | 'soon' | 'ok' }[]
  worst: 'overdue' | 'soon' | 'ok'
}

const PreventiveCarePage = () => {
  const { setTitle, clearTitle } = useTopbarTitle()
  const { assets }     = useAssets()
  const { categories } = useCategories()

  useEffect(() => { setTitle('Preventive Care'); return clearTitle }, [])

  const [filter, setFilter]               = useState<CareFilter>('all')
  const [logModalAsset, setLogModalAsset] = useState<Asset | null>(null)
  const [logDates, setLogDates]           = useState<Record<string, string>>({})
  const [saving, setSaving]               = useState<string | null>(null)

  const groups = useMemo<AssetGroup[]>(() => {
    const p = { overdue: 0, soon: 1, ok: 2 }
    return assets
      .filter(a => !a.isDeleted)
      .flatMap(asset => {
        const cat = categories.find(c => c.id === asset.categoryId)
        if (!cat?.careTasks?.length) return []
        const tasks = cat.careTasks.map(task => {
          const ts       = asset.careCompletions?.[task.id]
          const lastDone = ts ? ts.toDate() : null
          const nextDue  = getNextDue(lastDone, task.freq)
          return { task, lastDone, nextDue, status: dueStatus(nextDue) as 'overdue' | 'soon' | 'ok' }
        })
        const worst = tasks.reduce<'overdue'|'soon'|'ok'>((w, t) => p[t.status] < p[w] ? t.status : w, 'ok')
        return [{
          asset,
          catName:     cat.name,
          catIcon:     cat.icon ?? 'pi pi-box',
          catColorKey: cat.colorKey ?? 'blue',
          subcategory: asset.subcategoryId ?? '',
          tasks,
          worst,
        }]
      })
      .sort((a, b) => p[a.worst] - p[b.worst])
  }, [assets, categories])

  const filtered = useMemo(() => {
    if (filter === 'all') return groups
    return groups.filter(g => g.worst === filter)
  }, [groups, filter])

  const counts = useMemo(() => ({
    overdue: groups.filter(g => g.worst === 'overdue').length,
    soon:    groups.filter(g => g.worst === 'soon').length,
    ok:      groups.filter(g => g.worst === 'ok').length,
  }), [groups])

  const openLog = (asset: Asset) => {
    const cat  = categories.find(c => c.id === asset.categoryId)
    const init: Record<string, string> = {}
    const today = new Date().toISOString().split('T')[0]
    cat?.careTasks?.forEach(t => { init[t.id] = today })
    setLogDates(init)
    setLogModalAsset(asset)
  }

  const handleLog = async (taskId: string) => {
    if (!logModalAsset) return
    setSaving(taskId)
    const d  = new Date((logDates[taskId] ?? new Date().toISOString().split('T')[0]) + 'T00:00:00')
    await assetService.logCare(logModalAsset.id, taskId, Timestamp.fromDate(d))
    setSaving(null)
  }

  const logCat = logModalAsset ? categories.find(c => c.id === logModalAsset.categoryId) : null

  const FILTERS: { v: CareFilter; l: string; count: number }[] = [
    { v: 'all',     l: 'All',        count: groups.length  },
    { v: 'overdue', l: '🔴 Overdue',  count: counts.overdue },
    { v: 'soon',    l: '⚠ Due Soon', count: counts.soon    },
    { v: 'ok',      l: '✅ OK',       count: counts.ok      },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-color)' }}>🔧 Preventive Care Schedule</div>
          <div style={{ fontSize: 13, marginTop: 4, color: 'var(--tt-text-secondary)' }}>Maintenance tasks due across all assets</div>
        </div>
        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {FILTERS.map(f => (
            <button
              key={f.v}
              type="button"
              onClick={() => setFilter(f.v)}
              style={{
                padding: '6px 14px', borderRadius: 99, fontFamily: 'DM Mono, monospace', fontSize: 11,
                cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                background: filter === f.v ? 'rgba(79,143,255,0.12)' : 'transparent',
                color:      filter === f.v ? 'var(--primary-color)'  : 'var(--tt-text-secondary)',
                border:     filter === f.v ? '1px solid rgba(79,143,255,0.4)' : '1px solid var(--tt-border)',
              }}
            >
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Asset groups */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--tt-text-muted)' }}>
          <i className="pi pi-calendar" style={{ fontSize: 40, display: 'block', marginBottom: 12, opacity: 0.2 }} />
          <div style={{ fontSize: 13 }}>No care tasks found.</div>
          <div style={{ fontSize: 11, marginTop: 4, opacity: 0.6 }}>Add care tasks in Options → Default Care Schedules.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(g => {
            const color = CATEGORY_COLORS[g.catColorKey as ColorKey] ?? CATEGORY_COLORS.blue
            const subtitle = [g.catName, g.subcategory, g.asset.location].filter(Boolean).join(' · ')
            return (
              <div key={g.asset.id} style={{ background: 'var(--surface-card)', border: '1px solid var(--tt-border-soft)', borderRadius: 14, overflow: 'hidden' }}>
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--tt-border-soft)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: color.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={g.catIcon} style={{ fontSize: 16, color: color.text }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--tt-text-primary)' }}>{g.asset.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--tt-text-muted)', marginTop: 2 }}>{subtitle}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openLog(g.asset)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'var(--surface-section)', border: '1px solid var(--tt-border)', color: 'var(--text-color)', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    <i className="pi pi-wrench" style={{ fontSize: 12 }} /> Log Service
                  </button>
                </div>

                {/* Task rows */}
                {g.tasks.map(({ task, lastDone, status }) => {
                  const fs  = FREQ_STYLE[task.freq] ?? FREQ_STYLE.asneeded
                  const sp  = STATUS_PILL[status]
                  return (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--tt-border-faint)' }}>
                      {/* Freq badge */}
                      <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 700, letterSpacing: '0.5px', background: fs.bg, color: fs.color, textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {task.freq}
                      </span>
                      {/* Task name */}
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--tt-text-primary)' }}>{task.task}</span>
                      {/* Status pill */}
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, background: sp.bg, color: sp.color, fontFamily: 'DM Mono, monospace', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: sp.color }} />
                        {sp.label}
                      </span>
                      {/* Last done */}
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--tt-text-muted)', flexShrink: 0, minWidth: 72, textAlign: 'right' }}>
                        {lastDone ? lastDone.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never done'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* Log Service Modal */}
      <Dialog
        visible={!!logModalAsset}
        onHide={() => setLogModalAsset(null)}
        blockScroll
        draggable={false}
        resizable={false}
        style={{ width: '560px' }}
        header={
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--tt-text-primary)' }}>
              🔧 Log Service — {logModalAsset?.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--tt-text-muted)', marginTop: 3 }}>
              {logCat?.name ?? '—'} · {logModalAsset?.location || '—'}
            </div>
          </div>
        }
        footer={
          <button type="button" onClick={() => setLogModalAsset(null)} style={{ padding: '8px 18px', borderRadius: 8, background: 'transparent', border: '1px solid var(--tt-border)', color: 'var(--tt-text-secondary)', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>
            Close
          </button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!logCat?.careTasks?.length ? (
            <p style={{ color: 'var(--tt-text-muted)', fontSize: 13 }}>No care tasks defined for this category.</p>
          ) : logCat.careTasks.map(task => {
            const ts      = logModalAsset?.careCompletions?.[task.id]
            const lastStr = ts ? ts.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never logged'
            const fs      = FREQ_STYLE[task.freq] ?? FREQ_STYLE.asneeded
            return (
              <div key={task.id} style={{ background: 'var(--surface-section)', border: '1px solid var(--tt-border-soft)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 700, background: fs.bg, color: fs.color, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {task.freq}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1, color: 'var(--tt-text-primary)' }}>{task.task}</span>
                  <span style={{ fontSize: 12, color: 'var(--tt-text-dim)', whiteSpace: 'nowrap' }}>{lastStr}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="date"
                    value={logDates[task.id] ?? new Date().toISOString().split('T')[0]}
                    onChange={e => setLogDates(p => ({ ...p, [task.id]: e.target.value }))}
                    style={{ flex: 1, background: 'var(--surface-card)', border: '1px solid var(--tt-border)', borderRadius: 8, padding: '7px 10px', color: 'var(--text-color)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }}
                  />
                  <button
                    type="button"
                    disabled={saving === task.id}
                    onClick={() => handleLog(task.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'var(--primary-color)', border: 'none', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: saving === task.id ? 'not-allowed' : 'pointer', opacity: saving === task.id ? 0.5 : 1, whiteSpace: 'nowrap' }}
                  >
                    {saving === task.id
                      ? <><i className="pi pi-spin pi-spinner" style={{ fontSize: 12 }} /> Saving…</>
                      : <>✓ Mark Done</>}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </Dialog>
    </div>
  )
}

export default PreventiveCarePage
