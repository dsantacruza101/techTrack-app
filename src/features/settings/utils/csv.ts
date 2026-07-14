/** Minimal RFC4180-style CSV parser — handles quoted fields, embedded commas/newlines, and "" escapes. */
export const parseCSV = (text: string): string[][] => {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else {
        field += c
      }
      continue
    }
    if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\r') { /* ignore, \n terminates the row */ }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else field += c
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }

  return rows.filter(r => r.some(cell => cell.trim() !== ''))
}

export const parseCSVNumber = (v: string | undefined): number => {
  if (!v) return 0
  const n = parseFloat(v.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export const parseCSVDate = (v: string | undefined): Date | null => {
  if (!v?.trim()) return null
  const d = new Date(v.trim())
  return Number.isNaN(d.getTime()) ? null : d
}
