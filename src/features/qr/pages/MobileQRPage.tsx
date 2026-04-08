import { useState, useMemo, useEffect, useRef } from 'react'
import QRCode from 'react-qr-code'
import { useAssets } from '../../assets/hooks/useAssets'
import { useCategories } from '../../categories/hooks/useCategories'
import { useTopbarTitle } from '../../../contexts/TopbarContext'

const PRINT_STYLES = `
  @media print {
    body > * { display: none !important; }
    #qr-print-area { display: block !important; }

    #qr-print-area {
      position: fixed;
      inset: 0;
      background: #fff;
      padding: 24px;
      font-family: 'DM Sans', sans-serif;
    }

    .qr-label-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .qr-label {
      display: flex;
      align-items: center;
      gap: 14px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
      break-inside: avoid;
    }

    .qr-label-single {
      display: flex;
      align-items: center;
      gap: 24px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px 28px;
      width: fit-content;
      margin: 40px auto;
    }

    .qr-label-info { flex: 1; min-width: 0; }
    .qr-label-name { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 3px; }
    .qr-label-tag  { font-size: 11px; font-family: monospace; color: #64748b; margin-bottom: 2px; }
    .qr-label-meta { font-size: 11px; color: #94a3b8; }
    .qr-label-single .qr-label-name { font-size: 18px; margin-bottom: 6px; }
    .qr-label-single .qr-label-tag  { font-size: 13px; margin-bottom: 4px; }
    .qr-label-single .qr-label-meta { font-size: 12px; }

    .qr-print-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .qr-print-header-title { font-size: 14px; font-weight: 700; color: #0f172a; }
    .qr-print-header-sub   { font-size: 11px; color: #94a3b8; margin-top: 2px; }
    .qr-print-logo { font-size: 13px; font-weight: 600; color: #4f8fff; }
  }
`

const card = (): React.CSSProperties => ({
  background: 'var(--surface-card)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
})

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--surface-section)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 9, padding: '9px 12px',
  color: 'var(--text-color)', fontFamily: 'inherit', fontSize: 13,
  outline: 'none',
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    fontSize: 10, fontFamily: 'monospace', letterSpacing: '1.5px',
    textTransform: 'uppercase', color: 'var(--text-color-secondary)',
    marginBottom: 6,
  }}>
    {children}
  </div>
)

const MOBILE_FEATURES = [
  { icon: '📷', text: 'Built-in barcode & QR code scanning' },
  { icon: '🌐', text: 'Offline mode — sync when back online' },
  { icon: '📋', text: 'Full asset auditing from your phone' },
  { icon: '🔔', text: 'Push notifications for overdue maintenance' },
  { icon: '📝', text: 'Log work orders & care tasks on the go' },
]

const MobileQRPage = () => {
  const { setTitle, clearTitle } = useTopbarTitle()
  const { assets }     = useAssets()
  const { categories } = useCategories()

  useEffect(() => { setTitle('Mobile & QR'); return clearTitle }, [])

  const [selectedId, setSelectedId]     = useState<string>('')
  const [serialLookup, setSerialLookup] = useState('')
  const [selected, setSelected]         = useState<Set<string>>(new Set())
  const [printMode, setPrintMode]       = useState<'single' | 'bulk' | null>(null)
  const printRef                        = useRef<HTMLDivElement>(null)

  const activeAssets = useMemo(() => assets.filter(a => !a.isDeleted), [assets])

  const selectedAsset = activeAssets.find(a => a.id === selectedId)

  const lookupResults = useMemo(() => {
    if (!serialLookup.trim()) return []
    const q = serialLookup.toLowerCase()
    return activeAssets.filter(a =>
      a.serialNumber?.toLowerCase().includes(q) ||
      a.assetTag?.toLowerCase().includes(q) ||
      a.name?.toLowerCase().includes(q)
    ).slice(0, 5)
  }, [activeAssets, serialLookup])

  const getCategoryName = (catId: string) =>
    categories.find(c => c.id === catId)?.name ?? '—'

  const qrValue = (asset: typeof activeAssets[0]) =>
    `TECHTRACK|${asset.id}|${asset.name}|${asset.serialNumber}|${asset.assetTag}`

  const toggleSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const selectAll = () => setSelected(new Set(activeAssets.map(a => a.id)))
  const clearAll  = () => setSelected(new Set())

  const triggerPrint = (mode: 'single' | 'bulk') => {
    setPrintMode(mode)
    setTimeout(() => {
      // Inject a style tag that hides the app shell and shows only the print area
      const style = document.createElement('style')
      style.id = 'qr-print-override'
      style.textContent = `
        @media print {
          #root > * { display: none !important; }
          #qr-print-area { display: block !important; position: fixed; inset: 0; background: #fff; padding: 24px; }
        }
      `
      document.head.appendChild(style)
      window.print()
      // Clean up after print dialog closes
      setTimeout(() => {
        document.getElementById('qr-print-override')?.remove()
        setPrintMode(null)
      }, 500)
    }, 150)
  }

  const bulkAssets = activeAssets.filter(a => selected.has(a.id))

  const ghostBtn: React.CSSProperties = {
    padding: '6px 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 500,
    fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.15s',
    background: 'transparent', color: 'var(--text-color-secondary)',
    border: '1px solid rgba(255,255,255,0.12)',
  }

  const primaryBtn: React.CSSProperties = {
    padding: '6px 16px', borderRadius: 9, fontSize: 12.5, fontWeight: 500,
    fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.15s',
    background: 'var(--primary-color)', color: '#fff', border: 'none',
    boxShadow: '0 1px 3px rgba(79,143,255,0.3)',
  }

  return (
    <>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-color)', marginBottom: 6 }}>
          📱 Mobile App & QR / Barcode Scanning
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['iOS and Android compatible', 'Barcode/QR scanning', 'Offline mode', 'Asset auditing'].map(tag => (
            <span key={tag} style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 99,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-color-secondary)',
            }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── Top two panels ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Generate QR Code */}
        <div style={{ ...card(), padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-color)', marginBottom: 4 }}>
              🔲 Generate Asset QR Code
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-color-secondary)' }}>
              Select an asset to generate a printable QR code label for physical scanning.
            </div>
          </div>

          <div>
            <Label>Select Asset</Label>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="" style={{ background: 'var(--surface-card)' }}>— Pick an asset —</option>
              {activeAssets.map(a => (
                <option key={a.id} value={a.id} style={{ background: 'var(--surface-card)' }}>
                  {a.name}{a.assetTag ? ` — ${a.assetTag}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* QR display area */}
          <div style={{
            flex: 1, minHeight: 180,
            background: 'var(--surface-section)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            padding: 20,
          }}>
            {selectedAsset ? (
              <>
                <div style={{ background: '#fff', padding: 12, borderRadius: 8, display: 'inline-flex' }}>
                  <QRCode value={qrValue(selectedAsset)} size={140} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-color)' }}>{selectedAsset.name}</div>
                  {selectedAsset.assetTag && (
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-color-secondary)', marginTop: 2 }}>
                      {selectedAsset.assetTag}
                    </div>
                  )}
                  {selectedAsset.serialNumber && (
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-color-secondary)' }}>
                      S/N: {selectedAsset.serialNumber}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--text-color-secondary)', marginTop: 2 }}>
                    {getCategoryName(selectedAsset.categoryId)}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-color-secondary)' }}>
                <i className="pi pi-qrcode" style={{ fontSize: 40, opacity: 0.15, display: 'block', marginBottom: 8 }} />
                <div style={{ fontSize: 13 }}>Select an asset above to generate its QR label</div>
              </div>
            )}
          </div>

          <button
            onClick={() => selectedAsset && triggerPrint('single')}
            disabled={!selectedAsset}
            style={{
              ...ghostBtn,
              width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6,
              opacity: selectedAsset ? 1 : 0.4, cursor: selectedAsset ? 'pointer' : 'not-allowed',
            }}
          >
            🖨 Print QR Label
          </button>
        </div>

        {/* Scan to Look Up */}
        <div style={{ ...card(), padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-color)', marginBottom: 4 }}>
              📡 Scan to Look Up Asset
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-color-secondary)' }}>
              On mobile, use your device camera to scan any asset's QR or barcode. Or manually enter a serial/ID below.
            </div>
          </div>

          <div>
            <Label>Manual Serial / Asset ID Lookup</Label>
            <div style={{ position: 'relative' }}>
              <input
                value={serialLookup}
                onChange={e => setSerialLookup(e.target.value)}
                placeholder="Enter serial or asset ID..."
                style={inputStyle}
              />
              {serialLookup && (
                <button
                  onClick={() => setSerialLookup('')}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-color-secondary)', fontSize: 14,
                  }}
                >×</button>
              )}
            </div>
          </div>

          {/* Lookup results */}
          {serialLookup && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {lookupResults.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-color-secondary)', textAlign: 'center', padding: '8px 0' }}>
                  No assets found matching "{serialLookup}"
                </div>
              ) : lookupResults.map(a => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  padding: '10px 12px',
                  background: 'var(--surface-section)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 9,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-color)', marginBottom: 2 }}>{a.name}</div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-color-secondary)' }}>
                      {[a.assetTag, a.serialNumber].filter(Boolean).join(' · ')}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-color-secondary)' }}>
                      {getCategoryName(a.categoryId)}{a.location ? ` — ${a.location}` : ''}
                    </div>
                  </div>
                  <div style={{ background: '#fff', padding: 6, borderRadius: 6, flexShrink: 0 }}>
                    <QRCode value={qrValue(a)} size={52} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mobile App Features */}
          <div style={{ marginTop: 'auto' }}>
            <Label>Mobile App Features</Label>
            <div style={{
              ...card(),
              padding: '12px 14px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              {MOBILE_FEATURES.map(f => (
                <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{f.icon}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-color-secondary)' }}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bulk QR Label Printing ───────────────────────────────── */}
      <div style={{ ...card(), padding: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-color)', marginBottom: 4 }}>
            🖨 Bulk QR Label Printing
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-color-secondary)' }}>
            Select multiple assets and generate a print sheet of QR labels for physical tagging.
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <button onClick={selectAll} style={ghostBtn}>Select All</button>
          <button onClick={clearAll}  style={ghostBtn}>Clear</button>
          <button
            onClick={() => selected.size > 0 && triggerPrint('bulk')}
            disabled={selected.size === 0}
            style={{ ...primaryBtn, opacity: selected.size === 0 ? 0.4 : 1, cursor: selected.size === 0 ? 'not-allowed' : 'pointer' }}
          >
            🖨 Print Selected Labels
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-color-secondary)', marginLeft: 4 }}>
            {selected.size} selected
          </span>
        </div>

        {/* Asset grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {activeAssets.map(a => {
            const isSel = selected.has(a.id)
            return (
              <div
                key={a.id}
                onClick={() => toggleSelect(a.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                  background: isSel ? 'rgba(79,143,255,0.08)' : 'var(--surface-section)',
                  border: `1px solid ${isSel ? 'rgba(79,143,255,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  transition: 'all 0.12s',
                }}
              >
                <i className="pi pi-tag" style={{ fontSize: 11, color: 'var(--text-color-secondary)', flexShrink: 0 }} />
                <span style={{
                  fontSize: 12, color: 'var(--text-color)', flex: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {a.name}
                </span>
                {/* Checkbox */}
                <div style={{
                  width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                  background: isSel ? 'var(--primary-color)' : 'transparent',
                  border: `2px solid ${isSel ? 'var(--primary-color)' : 'rgba(255,255,255,0.2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.12s',
                }}>
                  {isSel && <i className="pi pi-check" style={{ fontSize: 8, color: '#fff' }} />}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>

      {/* ── Print styles ─────────────────────────────────────────── */}
      <style>{PRINT_STYLES}</style>

      {/* ── Print area (hidden on screen, visible when printing) ─── */}
      <div id="qr-print-area" ref={printRef} style={{ display: 'none' }}>
        {/* Header */}
        <div className="qr-print-header">
          <div>
            <div className="qr-print-header-title">
              {printMode === 'bulk'
                ? `QR Labels — ${bulkAssets.length} Asset${bulkAssets.length !== 1 ? 's' : ''}`
                : 'QR Asset Label'}
            </div>
            <div className="qr-print-header-sub">
              Printed {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          <div className="qr-print-logo">TechTrack</div>
        </div>

        {/* Single label */}
        {printMode === 'single' && selectedAsset && (
          <div className="qr-label-single">
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, flexShrink: 0 }}>
              <QRCode value={qrValue(selectedAsset)} size={120} />
            </div>
            <div className="qr-label-info">
              <div className="qr-label-name">{selectedAsset.name}</div>
              {selectedAsset.assetTag && <div className="qr-label-tag">Tag: {selectedAsset.assetTag}</div>}
              {selectedAsset.serialNumber && <div className="qr-label-tag">S/N: {selectedAsset.serialNumber}</div>}
              <div className="qr-label-meta">{getCategoryName(selectedAsset.categoryId)}</div>
              {selectedAsset.location && <div className="qr-label-meta">{selectedAsset.location}</div>}
            </div>
          </div>
        )}

        {/* Bulk labels grid */}
        {printMode === 'bulk' && (
          <div className="qr-label-grid">
            {bulkAssets.map(a => (
              <div key={a.id} className="qr-label">
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: 6, flexShrink: 0 }}>
                  <QRCode value={qrValue(a)} size={72} />
                </div>
                <div className="qr-label-info">
                  <div className="qr-label-name">{a.name}</div>
                  {a.assetTag && <div className="qr-label-tag">Tag: {a.assetTag}</div>}
                  {a.serialNumber && <div className="qr-label-tag">S/N: {a.serialNumber}</div>}
                  <div className="qr-label-meta">{getCategoryName(a.categoryId)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default MobileQRPage
