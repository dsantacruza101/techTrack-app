import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from 'primereact/button'
import { useMapRooms } from '../hooks/useMapRooms'
import { usePermissions } from '../../auth/hooks/usePermissions'
import { mapRoomService } from '../services/mapRoomService'
import { ROOM_COLOR_OPTIONS, type MapRoom, type MapRoomFormData } from '../types/mapRoom.types'
import { useAssets } from '../../assets/hooks/useAssets'
import { useWorkOrders } from '../../workOrders/hooks/useWorkOrders'
import { useTopbarTitle } from '../../../contexts/TopbarContext'

const EMPTY: MapRoomFormData = {
  label: '', icon: '🏫', color: 'blue',
  floor: 'Main Building — Floor 1', x: 40, y: 40, w: 110, h: 70,
}

const DEFAULT_ROOMS: MapRoomFormData[] = [
  { label: 'Room 101',         icon: '🏫', color: 'blue',   floor: 'Main Building — Floor 1', x: 30,  y: 40,  w: 100, h: 70 },
  { label: 'Room 102',         icon: '🏫', color: 'blue',   floor: 'Main Building — Floor 1', x: 145, y: 40,  w: 100, h: 70 },
  { label: 'Room 204',         icon: '🏫', color: 'blue',   floor: 'Main Building — Floor 1', x: 260, y: 40,  w: 100, h: 70 },
  { label: 'Room 105',         icon: '🏫', color: 'blue',   floor: 'Main Building — Floor 1', x: 30,  y: 130, w: 100, h: 70 },
  { label: 'Library',          icon: '📚', color: 'purple', floor: 'Main Building — Floor 1', x: 145, y: 130, w: 130, h: 70 },
  { label: 'Server Room',      icon: '🖥',  color: 'purple', floor: 'Main Building — Floor 1', x: 290, y: 130, w: 100, h: 70 },
  { label: 'Gymnasium',        icon: '🏃', color: 'green',  floor: 'Main Building — Floor 1', x: 375, y: 40,  w: 140, h: 130 },
  { label: 'Equipment Shed',   icon: '🏚', color: 'orange', floor: 'Main Building — Floor 1', x: 545, y: 130, w: 90,  h: 70 },
  { label: 'Custodial',        icon: '🧹', color: 'blue',   floor: 'Main Building — Floor 1', x: 545, y: 40,  w: 90,  h: 70 },
  { label: 'Main Office',      icon: '🗂',  color: 'blue',   floor: 'Main Building — Floor 1', x: 30,  y: 220, w: 130, h: 70 },
  { label: 'Auditorium',       icon: '🎭', color: 'blue',   floor: 'Main Building — Floor 1', x: 145, y: 220, w: 160, h: 90 },
  { label: 'Security Office',  icon: '📷', color: 'blue',   floor: 'Main Building — Floor 1', x: 320, y: 220, w: 100, h: 70 },
  { label: 'Mechanical Room',  icon: '⚙️', color: 'orange', floor: 'Main Building — Floor 1', x: 430, y: 220, w: 100, h: 70 },
  { label: 'Entrance',         icon: '🚪', color: 'blue',   floor: 'Main Building — Floor 1', x: 545, y: 220, w: 90,  h: 70 },
]

const FACILITY_EMOJIS = [
  '🏫','🏢','🏃','📚','🖥','🔬','🎭','🗂','🧹','🚿','🚪','⚙️','🔧','🏚',
  '📷','🎨','🏋️','🍽','🏥','🔒','💡','🖨','📦','🛒','🎵','🏊','⚽','🎮',
  '🖱','💻','📱','🖨','🗄','🔌','📡','🧪','🧫','🔭','🗳','📋','🗃','📁',
  '🚑','🚒','🚓','🛗','♿','🧯','🪣','🧰','🪑','🛋','🛏','🚽','🪟','🚧',
]

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label style={{
    fontSize: 10, fontFamily: 'monospace', letterSpacing: '1.5px',
    textTransform: 'uppercase', color: 'var(--text-color-secondary)',
  }}>
    {children}
  </label>
)

type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se'
interface ResizeState {
  id: string; corner: ResizeCorner
  startX: number; startY: number
  startW: number; startH: number; startRX: number; startRY: number
}

const COLOR_HEX: Record<string, string> = {
  blue:   '#4f8fff',
  green:  '#22c55e',
  purple: '#7c3aed',
  yellow: '#f59e0b',
  red:    '#ef4444',
  orange: '#f97316',
  cyan:   '#06b6d4',
}

const MapPage = () => {
  const { setTitle, clearTitle } = useTopbarTitle()
  const { rooms, loading } = useMapRooms()
  const { assets }         = useAssets()
  const { workOrders }     = useWorkOrders()
  const { can }            = usePermissions()

  useEffect(() => { setTitle('Interactive Facility Map'); return clearTitle }, [])

  const [editing, setEditing]             = useState(false)
  const [addOpen, setAddOpen]             = useState(false)
  const [form, setForm]                   = useState<MapRoomFormData>(EMPTY)
  const [saving, setSaving]               = useState(false)
  const [selected, setSelected]           = useState<MapRoom | null>(null)
  const [dragging, setDragging]           = useState<{ id: string; ox: number; oy: number } | null>(null)
  const [resizing, setResizing]           = useState<ResizeState | null>(null)
  const [filter, setFilter]               = useState<'all' | 'assets' | 'workorders' | 'alerts'>('all')
  const [floorLabelDraft, setFloorLabelDraft] = useState('')
  const [resetting, setResetting]         = useState(false)
  const [emojiOpen, setEmojiOpen]         = useState(false)
  const mapRef                            = useRef<HTMLDivElement>(null)
  const iconBtnRef                        = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!selected && rooms.length > 0) setSelected(rooms[0])
  }, [rooms])

  useEffect(() => {
    if (editing && rooms.length > 0) setFloorLabelDraft(floors[0] ?? '')
  }, [editing])

  const set = <K extends keyof MapRoomFormData>(k: K, v: MapRoomFormData[K]) =>
    setForm(p => ({ ...p, [k]: v }))

  const handleAdd = async () => {
    if (!form.label.trim()) return
    setSaving(true)
    await mapRoomService.create(form)
    setSaving(false); setAddOpen(false); setForm(EMPTY)
  }

  const handleDelete = async (id: string) => {
    await mapRoomService.delete(id)
    if (selected?.id === id) setSelected(null)
  }

  const handleResetMap = async () => {
    if (!window.confirm('This will delete all rooms and restore the default layout. Continue?')) return
    setResetting(true)
    for (const r of rooms) await mapRoomService.delete(r.id)
    for (const r of DEFAULT_ROOMS) await mapRoomService.create(r)
    setResetting(false); setSelected(null)
  }

  const saveFloorLabel = async () => {
    const newFloor = floorLabelDraft.trim()
    if (!newFloor || !floors[0]) return
    const toUpdate = rooms.filter(r => r.floor === floors[0])
    await Promise.all(toUpdate.map(r => mapRoomService.update(r.id, { floor: newFloor })))
  }

  // ── Drag ─────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent, room: MapRoom) => {
    if (!editing || resizing) return
    e.preventDefault()
    const rect = mapRef.current?.getBoundingClientRect()
    if (!rect) return
    setDragging({ id: room.id, ox: e.clientX - rect.left - room.x, oy: e.clientY - rect.top - room.y })
  }

  // ── Resize ───────────────────────────────────────────────────────
  const handleResizeDown = (e: React.MouseEvent, room: MapRoom, corner: ResizeCorner) => {
    e.preventDefault(); e.stopPropagation()
    setResizing({
      id: room.id, corner,
      startX: e.clientX, startY: e.clientY,
      startW: room.w, startH: room.h, startRX: room.x, startRY: room.y,
    })
  }

  const handleMouseMove = useCallback(async (e: React.MouseEvent) => {
    const rect = mapRef.current?.getBoundingClientRect()
    if (!rect) return
    if (resizing) {
      const dx = e.clientX - resizing.startX
      const dy = e.clientY - resizing.startY
      const sW = resizing.startW, sH = resizing.startH
      let w = sW, h = sH, x = resizing.startRX, y = resizing.startRY
      const MIN_W = 60, MIN_H = 40
      if (resizing.corner === 'se') { w = Math.max(MIN_W, sW + dx); h = Math.max(MIN_H, sH + dy) }
      if (resizing.corner === 'sw') { w = Math.max(MIN_W, sW - dx); h = Math.max(MIN_H, sH + dy); x = resizing.startRX + (sW - w) }
      if (resizing.corner === 'ne') { w = Math.max(MIN_W, sW + dx); h = Math.max(MIN_H, sH - dy); y = resizing.startRY + (sH - h) }
      if (resizing.corner === 'nw') { w = Math.max(MIN_W, sW - dx); h = Math.max(MIN_H, sH - dy); x = resizing.startRX + (sW - w); y = resizing.startRY + (sH - h) }
      await mapRoomService.update(resizing.id, { w, h, x: Math.max(0, x), y: Math.max(0, y) })
      return
    }
    if (dragging && editing) {
      const x = Math.max(0, e.clientX - rect.left - dragging.ox)
      const y = Math.max(0, e.clientY - rect.top  - dragging.oy)
      await mapRoomService.update(dragging.id, { x, y })
    }
  }, [dragging, resizing, editing])

  const handleMouseUp = () => { setDragging(null); setResizing(null) }

  // ── Data helpers ─────────────────────────────────────────────────
  const roomAssets = (room: MapRoom) =>
    assets.filter(a => !a.isDeleted && a.location?.toLowerCase().includes(room.label.toLowerCase()))

  const roomWorkOrders = (room: MapRoom) =>
    workOrders.filter(w =>
      w.status !== 'completed' && w.status !== 'cancelled' &&
      assets.find(a => a.id === w.assetId)?.location?.toLowerCase().includes(room.label.toLowerCase())
    )

  const roomAlertCount = (room: MapRoom) => {
    const ra = roomAssets(room)
    return ra.filter(a => {
      const pct = (Date.now() - a.purchaseDate.toDate().getTime()) / (a.lifespanYears * 365.25 * 86400000)
      return pct >= 0.8
    }).length + roomWorkOrders(room).filter(w => w.priority === 'critical' || w.priority === 'high').length
  }

  const floors = [...new Set(rooms.map(r => r.floor))].sort()

  const FILTER_CHIPS = [
    { label: 'All',         value: 'all'        as const },
    { label: 'Assets',      value: 'assets'     as const },
    { label: 'Work Orders', value: 'workorders' as const },
    { label: 'Alerts',      value: 'alerts'     as const },
  ]

  const summary = rooms
    .map(r => ({ room: r, count: roomAssets(r).length }))
    .sort((a, b) => b.count - a.count)

  const detailRoom   = selected ?? rooms[0] ?? null
  const detailAssets = detailRoom ? roomAssets(detailRoom) : []
  const detailWOs    = detailRoom ? roomWorkOrders(detailRoom) : []
  const VISIBLE_ASSETS = 5

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface-section)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 9, padding: '9px 12px',
    color: 'var(--text-color)', fontFamily: 'inherit', fontSize: 13,
    outline: 'none', width: '100%', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  }

  const ghostBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', borderRadius: 9,
    fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500,
    cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
    background: 'transparent', color: 'var(--text-color-secondary)',
    border: '1px solid rgba(255,255,255,0.12)',
  }

  const primaryBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 14px', borderRadius: 9,
    fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500,
    cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
    background: 'var(--primary-color)', color: '#fff', border: 'none',
    boxShadow: '0 1px 3px rgba(79,143,255,0.3)',
  }

  // Grid background for map canvas
  const gridBg = `
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
  `

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-color)', marginBottom: 2 }}>
            Interactive Facility Map
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-color-secondary)' }}>
            Visual map-based view of assets, work orders, and maintenance needs by location
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Filter chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {FILTER_CHIPS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                style={{
                  padding: '5px 13px', borderRadius: 7, fontSize: 13, fontWeight: 500,
                  fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.15s',
                  background: filter === f.value ? 'rgba(79,143,255,0.12)' : 'transparent',
                  border: filter === f.value
                    ? '1px solid rgba(79,143,255,0.35)'
                    : '1px solid rgba(255,255,255,0.07)',
                  color: filter === f.value ? '#4f8fff' : 'var(--text-color-secondary)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Separator */}
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />

          {/* Edit Map / View Mode */}
          {can('edit_map') && (
            editing ? (
              <Button
                label="View Mode"
                size="small"
                onClick={() => { setEditing(false); setDragging(null); setResizing(null) }}
              />
            ) : (
              <Button
                label="✏ Edit Map"
                size="small"
                severity="secondary"
                outlined
                onClick={() => setEditing(true)}
              />
            )
          )}
        </div>
      </div>

      {/* ── Edit toolbar ─────────────────────────────────────────── */}
      {editing && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          padding: '12px 16px',
          background: 'var(--surface-card)',
          border: '1px solid rgba(79,143,255,0.3)',
          borderRadius: 10,
        }}>
          <span style={{
            fontSize: 13, fontWeight: 600, color: '#4f8fff', whiteSpace: 'nowrap',
          }}>
            ✏ Edit Mode
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-color-secondary)', whiteSpace: 'nowrap' }}>
            Drag rooms to reposition · Drag corners to resize · Click label to rename
          </span>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setAddOpen(true)} style={ghostBtn}>+ Add Room</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-color-secondary)', whiteSpace: 'nowrap' }}>Floor Label:</span>
              <input
                value={floorLabelDraft}
                onChange={e => setFloorLabelDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveFloorLabel()}
                style={{
                  background: 'var(--surface-section)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 9, padding: '5px 9px',
                  fontSize: 12, fontFamily: 'inherit',
                  color: 'var(--text-color)', outline: 'none', width: 200,
                }}
              />
            </div>

            <button onClick={saveFloorLabel} style={ghostBtn}>Save Label</button>

            <button onClick={handleResetMap} disabled={resetting} style={ghostBtn}>
              {resetting ? '...' : '↺ Reset'}
            </button>

            <button
              onClick={() => { setEditing(false); setDragging(null); setResizing(null) }}
              style={primaryBtn}
            >
              ✓ Done Editing
            </button>
          </div>
        </div>
      )}

      {/* ── Main layout ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18, alignItems: 'start' }}>

        {/* ── Map area ──────────────────────────────────────────── */}
        <div>
          {/* Canvas */}
          <div
            ref={mapRef}
            style={{
              position: 'relative',
              background: 'var(--surface-section)',
              backgroundImage: gridBg,
              backgroundSize: '60px 60px',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              overflow: 'hidden',
              height: 540,
              cursor: dragging ? 'grabbing' : resizing ? 'nwse-resize' : 'default',
              userSelect: 'none',
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <i className="pi pi-spin pi-spinner" style={{ fontSize: 24, color: 'var(--text-color-secondary)' }} />
              </div>
            ) : rooms.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--text-color-secondary)' }}>
                <i className="pi pi-map" style={{ fontSize: 48, opacity: 0.2 }} />
                <div style={{ fontSize: 14 }}>No rooms added yet.</div>
                {can('edit_map') && <Button label="Edit Map to add rooms" size="small" text onClick={() => setEditing(true)} />}
              </div>
            ) : (
              <>
                {/* Floor label */}
                <div style={{
                  position: 'absolute', top: 12, left: 14,
                  fontSize: 12, fontFamily: "'DM Mono', monospace",
                  color: 'var(--text-color-secondary)',
                  letterSpacing: '2px', textTransform: 'uppercase',
                  pointerEvents: 'none', zIndex: 1,
                }}>
                  {floors[0] ?? 'Main Building — Floor 1'}
                </div>

                {/* Rooms */}
                {rooms.map(room => {
                  const hex      = COLOR_HEX[room.color] ?? '#4f8fff'
                  const rAssets  = roomAssets(room)
                  const rWOs     = roomWorkOrders(room)
                  const alertCt  = roomAlertCount(room)
                  const maintCt  = rAssets.filter(a => a.status === 'maintenance').length
                  const isSel    = selected?.id === room.id
                  const isHidden =
                    (filter === 'assets'     && rAssets.length === 0) ||
                    (filter === 'workorders' && rWOs.length === 0)    ||
                    (filter === 'alerts'     && alertCt === 0)
                  const HANDLE_SZ = 10

                  // Status pin counts for display
                  const activeCt = rAssets.filter(a => a.status === 'active').length

                  return (
                    <div
                      key={room.id}
                      style={{
                        position: 'absolute',
                        left: room.x, top: room.y, width: room.w, height: room.h,
                        background: alertCt > 0
                          ? 'rgba(239,68,68,0.07)'
                          : maintCt > 0
                            ? 'rgba(245,158,11,0.06)'
                            : `rgba(${hexToRgb(hex)},0.08)`,
                        border: `1px solid ${
                          alertCt > 0
                            ? 'rgba(239,68,68,0.45)'
                            : isSel
                              ? hex
                              : `rgba(${hexToRgb(hex)},0.35)`
                        }`,
                        borderRadius: 6,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        cursor: editing ? 'move' : 'pointer',
                        opacity: isHidden && !editing ? 0.25 : 1,
                        transition: dragging?.id === room.id || resizing?.id === room.id ? 'none' : 'all 0.15s',
                        outline: editing ? `2px dashed rgba(79,143,255,0.5)` : isSel ? `2px solid ${hex}` : 'none',
                        outlineOffset: editing ? 0 : 2,
                        boxShadow: isSel && !editing ? `0 0 0 2px ${hex}44` : undefined,
                        fontSize: 11, color: 'var(--text-color-secondary)',
                        overflow: 'visible',
                      }}
                      onMouseDown={e => handleMouseDown(e, room)}
                      onClick={() => { if (!editing && !dragging && !resizing) setSelected(room) }}
                    >
                      {/* Delete badge */}
                      {editing && (
                        <div
                          onMouseDown={e => e.stopPropagation()}
                          onClick={e => { e.stopPropagation(); handleDelete(room.id) }}
                          style={{
                            position: 'absolute', top: -10, right: -10,
                            width: 20, height: 20, borderRadius: '50%',
                            background: 'var(--red, #ef4444)',
                            border: '2px solid var(--surface-card)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', zIndex: 11, fontWeight: 700,
                          }}
                        >
                          <i className="pi pi-times" style={{ fontSize: 8, color: '#fff' }} />
                        </div>
                      )}

                      {/* Icon + label (centered) */}
                      <div style={{ fontSize: 14, marginBottom: 2 }}>{room.icon}</div>
                      <div style={{
                        fontSize: 11, fontWeight: 600,
                        color: isSel ? hex : 'var(--text-color)',
                        textAlign: 'center', padding: '0 6px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%',
                      }}>
                        {room.label}
                      </div>

                      {/* Status pins */}
                      {!editing && (
                        <div style={{ display: 'flex', gap: 3, marginTop: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
                          {activeCt > 0 && Array.from({ length: Math.min(activeCt, 4) }).map((_, i) => (
                            <div key={`a${i}`} style={{
                              width: 10, height: 10, borderRadius: '50%',
                              background: 'rgba(34,197,94,0.25)', border: '2px solid #22c55e',
                            }} />
                          ))}
                          {maintCt > 0 && Array.from({ length: Math.min(maintCt, 3) }).map((_, i) => (
                            <div key={`m${i}`} style={{
                              width: 10, height: 10, borderRadius: '50%',
                              background: 'rgba(245,158,11,0.25)', border: '2px solid #f59e0b',
                            }} />
                          ))}
                          {rWOs.length > 0 && (
                            <div style={{
                              width: 10, height: 10, borderRadius: '50%',
                              background: 'rgba(79,143,255,0.25)', border: '2px solid #4f8fff',
                            }} />
                          )}
                          {alertCt > 0 && (
                            <div style={{
                              width: 10, height: 10, borderRadius: '50%',
                              background: 'rgba(239,68,68,0.25)', border: '2px solid #ef4444',
                            }} />
                          )}
                        </div>
                      )}

                      {/* Resize handles */}
                      {editing && (['nw', 'ne', 'sw', 'se'] as ResizeCorner[]).map(corner => {
                        const isN = corner.startsWith('n'), isW = corner.endsWith('w')
                        return (
                          <div
                            key={corner}
                            onMouseDown={e => handleResizeDown(e, room, corner)}
                            style={{
                              position: 'absolute',
                              width: HANDLE_SZ, height: HANDLE_SZ,
                              top:    isN ? -HANDLE_SZ / 2 : undefined,
                              bottom: !isN ? -HANDLE_SZ / 2 : undefined,
                              left:   isW ? -HANDLE_SZ / 2 : undefined,
                              right:  !isW ? -HANDLE_SZ / 2 : undefined,
                              background: '#4f8fff', borderRadius: 2,
                              border: '2px solid #fff',
                              cursor: `${corner}-resize`, zIndex: 10,
                            }}
                          />
                        )
                      })}
                    </div>
                  )
                })}
              </>
            )}
          </div>

          {/* ── Legend ──────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-color-secondary)' }}>
            {[
              { color: '#22c55e', bg: 'rgba(34,197,94,0.25)',  label: 'Active Asset' },
              { color: '#f59e0b', bg: 'rgba(245,158,11,0.25)', label: 'In Maintenance' },
              { color: '#4f8fff', bg: 'rgba(79,143,255,0.25)', label: 'Work Order' },
              { color: '#ef4444', bg: 'rgba(239,68,68,0.25)',  label: 'Alert / Overdue' },
            ].map(({ color, bg, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: bg, border: `2px solid ${color}`, flexShrink: 0,
                }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* ── Sidebar ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Location Details label */}
          <div style={{
            fontSize: 12, fontFamily: "'DM Mono', monospace",
            color: 'var(--text-color-secondary)', letterSpacing: '2px',
            textTransform: 'uppercase',
          }}>
            Location Details
          </div>

          {/* Detail card */}
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: 14, minHeight: 200,
            marginTop: -8,
          }}>
            {!detailRoom ? (
              <div style={{ color: 'var(--text-color-secondary)', fontSize: 14, textAlign: 'center', padding: '30px 0' }}>
                Click a room on the map to see details
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-color)' }}>
                    {detailRoom.icon} {detailRoom.label}
                  </div>
                  {selected && (
                    <Button icon="pi pi-times" text size="small" rounded severity="secondary"
                      style={{ width: 24, height: 24, padding: 0 }}
                      onClick={() => setSelected(null)}
                    />
                  )}
                </div>
                <div style={{
                  fontSize: 11, fontFamily: 'monospace',
                  color: 'var(--text-color-secondary)', letterSpacing: '0.5px',
                }}>
                  {detailAssets.length} ASSETS · {detailWOs.length} OPEN WOS
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
                  {detailAssets.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-color-secondary)' }}>No assets in this room.</div>
                  ) : (
                    <>
                      {detailAssets.slice(0, VISIBLE_ASSETS).map(a => (
                        <div key={a.id} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '6px 10px',
                          background: 'var(--surface-section)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 8,
                        }}>
                          <i className="pi pi-desktop" style={{ fontSize: 12, color: 'var(--text-color-secondary)', flexShrink: 0 }} />
                          <span style={{
                            fontSize: 12, flex: 1,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            color: 'var(--text-color)',
                          }}>
                            {a.name} — {detailRoom.label.slice(0, 8)}...
                          </span>
                          <span style={{
                            fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 600, flexShrink: 0,
                            background: a.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                            color:      a.status === 'active' ? '#22c55e' : '#f59e0b',
                          }}>
                            {a.status}
                          </span>
                        </div>
                      ))}

                      {detailAssets.length > VISIBLE_ASSETS && (
                        <div style={{ fontSize: 12, color: '#4f8fff', padding: '2px 2px', cursor: 'pointer' }}>
                          +{detailAssets.length - VISIBLE_ASSETS} more...
                        </div>
                      )}

                      <button
                        style={{
                          marginTop: 4, width: '100%', padding: '7px 0',
                          background: 'transparent',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 8, cursor: 'pointer', fontSize: 12,
                          color: 'var(--text-color-secondary)', fontFamily: 'inherit',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        View All Assets →
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Location Summary label */}
          <div style={{
            fontSize: 12, fontFamily: "'DM Mono', monospace",
            color: 'var(--text-color-secondary)', letterSpacing: '2px',
            textTransform: 'uppercase',
          }}>
            Location Summary
          </div>

          {/* Summary list */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 6,
            maxHeight: 220, overflowY: 'auto',
            marginTop: -8,
          }}>
            {summary.map(({ room, count }) => {
              const hex  = COLOR_HEX[room.color] ?? '#4f8fff'
              const isSel = selected?.id === room.id
              return (
                <div
                  key={room.id}
                  onClick={() => setSelected(room)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 12px',
                    background: isSel ? 'rgba(255,255,255,0.05)' : 'var(--surface-card)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 8, cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'var(--surface-card)' }}
                >
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{room.icon}</span>
                  <span style={{
                    fontSize: 13, color: 'var(--text-color)', flex: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {room.label}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                    padding: '2px 8px', borderRadius: 99,
                    background: `rgba(${hexToRgb(hex)},0.15)`,
                    color: hex,
                  }}>
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Add Room Modal ───────────────────────────────────────── */}
      {addOpen && (
        <div
          onClick={e => { if (e.target === e.currentTarget) { setAddOpen(false); setEmojiOpen(false) } }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16, width: 460, maxWidth: '95vw',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 24px 20px' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-color)' }}>
                Add New Room / Location
              </div>
              <button
                onClick={() => { setAddOpen(false); setEmojiOpen(false) }}
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'var(--surface-section)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--text-color-secondary)', fontSize: 16,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />

            {/* Body */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Room name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <FieldLabel>Room Name *</FieldLabel>
                <input
                  autoFocus
                  value={form.label}
                  onChange={e => set('label', e.target.value)}
                  placeholder="e.g. Science Lab, Room 305, Storage B"
                  style={inputStyle}
                />
              </div>

              {/* Icon + Color */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, position: 'relative' }}>
                  <FieldLabel>Icon / Emoji</FieldLabel>
                  <button
                    ref={iconBtnRef}
                    type="button"
                    onClick={() => setEmojiOpen(o => !o)}
                    style={{
                      ...inputStyle,
                      textAlign: 'center', fontSize: 26,
                      cursor: 'pointer', lineHeight: 1,
                      padding: '10px 12px',
                      border: emojiOpen
                        ? '1px solid rgba(79,143,255,0.5)'
                        : '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    {form.icon || '🏫'}
                  </button>

                  {emojiOpen && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
                      background: 'var(--surface-card)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12, padding: 10,
                      display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)',
                      gap: 2, width: 260,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    }}>
                      {FACILITY_EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => { set('icon', emoji); setEmojiOpen(false) }}
                          style={{
                            width: 30, height: 30, borderRadius: 6, border: 'none',
                            background: form.icon === emoji ? 'rgba(79,143,255,0.2)' : 'transparent',
                            fontSize: 17, cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            transition: 'background 0.1s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                          onMouseLeave={e => (e.currentTarget.style.background = form.icon === emoji ? 'rgba(79,143,255,0.2)' : 'transparent')}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <FieldLabel>Color</FieldLabel>
                  <select
                    value={form.color}
                    onChange={e => set('color', e.target.value as MapRoomFormData['color'])}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {ROOM_COLOR_OPTIONS.map(o => (
                      <option key={o.value} value={o.value} style={{ background: 'var(--surface-card)' }}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Width + Height */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <FieldLabel>Width (px)</FieldLabel>
                  <input
                    type="number" min={60} max={300}
                    value={form.w}
                    onChange={e => set('w', Math.max(60, Math.min(300, Number(e.target.value))))}
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <FieldLabel>Height (px)</FieldLabel>
                  <input
                    type="number" min={40} max={200}
                    value={form.h}
                    onChange={e => set('h', Math.max(40, Math.min(200, Number(e.target.value))))}
                    style={inputStyle}
                  />
                </div>
              </div>

              <p style={{ fontSize: 13, color: 'var(--text-color-secondary)', margin: 0, lineHeight: 1.5 }}>
                The room will be placed in the top-left corner of the map. Drag it into position after adding.
              </p>
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px' }}>
              <button
                onClick={() => setAddOpen(false)}
                disabled={saving}
                style={ghostBtn}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !form.label.trim()}
                style={{
                  ...primaryBtn,
                  opacity: saving || !form.label.trim() ? 0.5 : 1,
                  cursor: saving || !form.label.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Adding...' : 'Add Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper: convert hex to "r,g,b" string for rgba()
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `${r},${g},${b}`
}

export default MapPage
