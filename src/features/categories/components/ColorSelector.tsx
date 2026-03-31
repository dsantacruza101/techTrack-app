import { CATEGORY_COLORS } from '../types/category.types'
import type { ColorKey } from '../types/category.types'
import './ColorSelector.css'

interface ColorSelectorProps {
  value: ColorKey
  onChange: (color: ColorKey) => void
}

/** Row of preset color swatches — click to select. */
const ColorSelector = ({ value, onChange }: ColorSelectorProps) => (
  <div className="tt-color-selector">
    {(Object.keys(CATEGORY_COLORS) as ColorKey[]).map((key) => (
      <button
        key={key}
        type="button"
        title={key}
        onClick={() => onChange(key)}
        className={`tt-color-swatch${value === key ? ' selected' : ''}`}
        style={{ background: CATEGORY_COLORS[key].swatch }}
      />
    ))}
  </div>
)

export default ColorSelector
