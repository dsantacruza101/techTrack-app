import { Button } from 'primereact/button'
import UserMenu from './UserMenu'
import { useSchool, type SchoolFilter } from '../../../../contexts/SchoolContext'
import { useSettings } from '../../../../features/settings/hooks/useSettings'
import { useTopbarTitle } from '../../../../contexts/TopbarContext'

interface TopbarProps {
  onMenuToggle: () => void
}

const Topbar = ({ onMenuToggle }: TopbarProps) => {
  const { school, setSchool } = useSchool()
  const { settings }          = useSettings()
  const { title }             = useTopbarTitle()

  const schools: { label: string; value: SchoolFilter }[] = [
    { label: 'All Schools',                      value: 'all'      },
    { label: settings.schoolAName || 'School A', value: 'school_a' },
    { label: settings.schoolBName || 'School B', value: 'school_b' },
  ]

  return (
    <div
      className="flex align-items-center"
      style={{
        position: 'sticky', top: 0, zIndex: 50,
        height: '62px', padding: '0 28px', gap: 12, flexShrink: 0,
        background: 'var(--surface-card)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Mobile menu toggle */}
      <Button
        icon="pi pi-bars"
        text
        severity="secondary"
        className="md:hidden flex-shrink-0"
        style={{ width: 32, height: 32 }}
        onClick={onMenuToggle}
      />

      {/* Page title */}
      <div
        className="font-serif font-bold text-900 flex-shrink-0"
        style={{ fontSize: 16, whiteSpace: 'nowrap' }}
      >
        {title || 'Facilities TechTrack'}
      </div>

      {/* School switcher — right next to title */}
      <div
        className="flex align-items-center gap-1 flex-shrink-0"
        style={{
          background: 'var(--surface-section)',
          borderRadius: 8,
          padding: '3px 4px',
          border: '1px solid var(--surface-border)',
        }}
      >
        {schools.map(s => (
          <button
            key={s.value}
            className="tt-school-btn"
            onClick={() => setSchool(s.value)}
            style={{
              padding: '4px 11px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              fontFamily: 'inherit',
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
              background: school === s.value ? 'var(--primary-color)' : 'transparent',
              color:      school === s.value ? '#fff' : 'var(--text-color-secondary)',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Portal slot — pages inject their action buttons here */}
      <div
        id="tt-topbar-actions"
        className="flex align-items-center gap-2 flex-1 justify-content-end"
        style={{ minWidth: 0, overflow: 'hidden' }}
      />

      <UserMenu />
    </div>
  )
}

export default Topbar
