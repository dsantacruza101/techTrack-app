interface SidebarNavSectionProps {
  label: string
}

const SidebarNavSection = ({ label }: SidebarNavSectionProps) => (
  <div
    className="font-mono text-xs px-3 pt-3 pb-1"
    style={{ letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-color-secondary)', opacity: 0.5 }}
  >
    {label}
  </div>
)

export default SidebarNavSection
