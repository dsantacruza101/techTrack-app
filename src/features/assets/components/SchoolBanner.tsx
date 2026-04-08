import type { Asset } from '../types/asset.types'
import type { Category } from '../../categories/types/category.types'
import { getLifespanStatus } from '../types/asset.types'

interface Props {
  school:          'all' | 'school_a' | 'school_b'
  schoolName:      string
  schoolBName:     string
  assets:          Asset[]      // all non-deleted assets
  categories:      Category[]
  onSwitchSchool:  (s: 'school_a' | 'school_b') => void
}

const careOverdueCount = (list: Asset[], categories: Category[]) =>
  list.filter(a => {
    const cat = categories.find(c => c.id === a.categoryId)
    if (!cat?.careTasks?.length) return false
    return Object.keys(a.careCompletions ?? {}).length === 0
  }).length

const CARD_STYLE: React.CSSProperties = {
  background:   'var(--surface-card)',
  border:       '1px solid rgba(255,255,255,0.07)',
  borderRadius: 14,
  padding:      '14px 20px',
  display:      'flex',
  alignItems:   'center',
  gap:          16,
  flexWrap:     'wrap',
}

/* ── Shared pill ────────────────────────────────────────────────────── */
const Pill = ({ icon, label, count, color, bg }: {
  icon: string; label: string; count: number; color: string; bg: string
}) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '5px 12px', borderRadius: 8,
    background: bg, border: `1px solid ${color}40`,
    fontSize: 13, fontWeight: 500, color, whiteSpace: 'nowrap',
  }}>
    <span>{icon}</span>
    <span>{count} {label}</span>
  </div>
)

/* ── Ghost button ───────────────────────────────────────────────────── */
const GhostBtn = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 13px', borderRadius: 8,
      background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
      color: 'var(--text-color-secondary)', fontSize: 13, fontWeight: 500,
      fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.35)'
      ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-color)'
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)'
      ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-color-secondary)'
    }}
  >
    {children}
  </button>
)

/* ── School summary chip (used in All Schools view) ─────────────────── */
const SchoolChip = ({ name, count, overdue, onClick }: {
  name: string; count: number; overdue: number; onClick: () => void
}) => (
  <button
    onClick={onClick}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: '6px 14px', borderRadius: 9,
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)' }}
    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)' }}
  >
    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-color)' }}>🏫 {name}:</span>
    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-color)' }}>{count}</span>
    {overdue > 0 && (
      <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 500 }}>· {overdue} overdue</span>
    )}
  </button>
)

/* ── Main component ─────────────────────────────────────────────────── */
const SchoolBanner = ({ school, schoolName, schoolBName, assets, categories, onSwitchSchool }: Props) => {
  const schoolA = assets.filter(a => a.school === 'school_a')
  const schoolB = assets.filter(a => a.school === 'school_b')

  /* ── All Schools mode ─────────────────────────────────────────────── */
  if (school === 'all') {
    return (
      <div style={CARD_STYLE}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: 15, color: 'var(--text-color)' }}>
            🏫 All Schools Overview
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-color-secondary)', marginTop: 2 }}>
            {assets.length} total assets across both campuses
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <SchoolChip
            name={schoolName}
            count={schoolA.length}
            overdue={careOverdueCount(schoolA, categories)}
            onClick={() => onSwitchSchool('school_a')}
          />
          <SchoolChip
            name={schoolBName}
            count={schoolB.length}
            overdue={careOverdueCount(schoolB, categories)}
            onClick={() => onSwitchSchool('school_b')}
          />
        </div>
      </div>
    )
  }

  /* ── Single school mode ───────────────────────────────────────────── */
  const filtered      = school === 'school_a' ? schoolA : schoolB
  const otherSchool   = school === 'school_a' ? 'school_b' : 'school_a'
  const otherName     = school === 'school_a' ? schoolBName : schoolName
  const otherCount    = school === 'school_a' ? schoolB.length : schoolA.length

  const active      = filtered.filter(a => a.status === 'active').length
  const maint       = filtered.filter(a => a.status === 'maintenance').length
  const replaceSoon = filtered.filter(a => {
    const s = getLifespanStatus(a.purchaseDate, a.lifespanYears)
    return s === 'replace' || s === 'aging'
  }).length
  const careOverdue = careOverdueCount(filtered, categories)

  return (
    <div style={CARD_STYLE}>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: 15, color: 'var(--text-color)' }}>
          🏫 {school === 'school_a' ? schoolName : schoolBName}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-color-secondary)', marginTop: 2 }}>
          {filtered.length} asset{filtered.length !== 1 ? 's' : ''} tracked · Viewing school-filtered data
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Pill icon="✅" label="Active"       count={active}      color="#22c55e" bg="rgba(34,197,94,0.1)"  />
        <Pill icon="🔧" label="Maint."       count={maint}       color="#f97316" bg="rgba(249,115,22,0.1)" />
        <Pill icon="🔴" label="Care Overdue" count={careOverdue} color="#ef4444" bg="rgba(239,68,68,0.1)"  />
        <Pill icon="⚠️" label="Replace Soon" count={replaceSoon} color="#f59e0b" bg="rgba(245,158,11,0.1)" />
        <GhostBtn onClick={() => onSwitchSchool(otherSchool)}>
          ⇄ Switch to {otherName} ({otherCount})
        </GhostBtn>
      </div>
    </div>
  )
}

export default SchoolBanner
