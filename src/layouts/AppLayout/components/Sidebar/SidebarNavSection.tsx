interface SidebarNavSectionProps {
  label: string
}

const SidebarNavSection = ({ label }: SidebarNavSectionProps) => (
  <div style={{
    fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '2.5px',
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)',
    padding: '14px 10px 5px', fontWeight: 500,
  }}>
    {label}
  </div>
)

export default SidebarNavSection
