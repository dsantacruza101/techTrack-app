import { CATEGORY_ICONS } from '../types/category.types'
import './IconSelector.css'

interface IconSelectorProps {
  value: string
  onChange: (icon: string) => void
}

/** Grid of preset PrimeIcon options — click to select. */
const IconSelector = ({ value, onChange }: IconSelectorProps) => (
  <div className="tt-icon-selector">
    {CATEGORY_ICONS.map((icon) => (
      <button
        key={icon.value}
        type="button"
        title={icon.label}
        onClick={() => onChange(icon.value)}
        className={`tt-icon-option${value === icon.value ? ' selected' : ''}`}
      >
        <i className={icon.value} />
      </button>
    ))}
  </div>
)

export default IconSelector
