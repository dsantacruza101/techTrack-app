import { useState, useEffect, useRef } from 'react'
import { setDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../../../firebase/config'
import { useSettings } from '../hooks/useSettings'
import { useCategories } from '../../categories/hooks/useCategories'
import { useAssets } from '../../assets/hooks/useAssets'
import { useMapRooms } from '../../map/hooks/useMapRooms'
import { mapRoomService } from '../../map/services/mapRoomService'
import { settingsService } from '../services/settingsService'
import { categoryService } from '../../categories/services/categoryService'
import {
  CARE_FREQUENCY_OPTIONS,
  CATEGORY_ICONS,
  type CareTask,
  type Category,
} from '../../categories/types/category.types'
import { usePermissions } from '../../auth/hooks/usePermissions'
import { useTopbarTitle } from '../../../contexts/TopbarContext'
import type { AppSettings } from '../types/settings.types'

let _tid = 1
const newId = () => `t_${Date.now()}_${_tid++}`

// ── Shared styles ─────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: 'var(--surface-card)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12, overflow: 'hidden',
}

const inputSt: React.CSSProperties = {
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
    textTransform: 'uppercase', color: 'var(--text-color-secondary)', marginBottom: 6,
  }}>
    {children}
  </div>
)

const CardHeader = ({ icon, children }: { icon: string; children: React.ReactNode }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
  }}>
    <span style={{ fontSize: 16 }}>{icon}</span>
    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-color)' }}>{children}</span>
  </div>
)

// Full-width ghost action button for Data Management
const ActionBtn = ({ icon, label, onClick, danger, disabled }: {
  icon: string; label: string; onClick: () => void; danger?: boolean; disabled?: boolean
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
      padding: '11px 14px', borderRadius: 9, cursor: disabled ? 'not-allowed' : 'pointer',
      background: 'transparent', fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
      border: `1px solid ${danger ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.08)'}`,
      color: danger ? '#ef4444' : 'var(--text-color-secondary)',
      opacity: disabled ? 0.5 : 1, transition: 'background 0.15s',
      textAlign: 'left',
    }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.03)' }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
  >
    <span style={{ fontSize: 14 }}>{icon}</span>
    {label}
  </button>
)

// ── Icon picker ───────────────────────────────────────────────────────────────
const IconPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: 40, height: 40, borderRadius: 8, flexShrink: 0,
          background: 'var(--surface-section)',
          border: '1px solid rgba(255,255,255,0.1)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <i className={value} style={{ fontSize: 15, color: 'var(--text-color)' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
          background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10, padding: 8,
          display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2, width: 200,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {CATEGORY_ICONS.map(ic => (
            <button
              key={ic.value}
              type="button"
              title={ic.label}
              onClick={() => { onChange(ic.value); setOpen(false) }}
              style={{
                width: 30, height: 30, borderRadius: 6, border: 'none',
                background: value === ic.value ? 'rgba(79,143,255,0.2)' : 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <i className={ic.value} style={{ fontSize: 13, color: 'var(--text-color)' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Category row ──────────────────────────────────────────────────────────────
const CategoryRow = ({ cat, assetCount }: { cat: Category; assetCount: number }) => {
  const [name, setName]       = useState(cat.name)
  const [subcats, setSubcats] = useState<string[]>(cat.subcategories ?? [])

  const saveName = async (val: string) => {
    if (val.trim() && val !== cat.name) await categoryService.update(cat.id, { name: val.trim() })
  }
  const saveSubcats = async (updated: string[]) => {
    const clean = updated.map(s => s.trim()).filter(Boolean)
    await categoryService.update(cat.id, { subcategories: clean })
    setSubcats(clean)
  }
  const updateSub  = (idx: number, val: string) => { const n = [...subcats]; n[idx] = val; setSubcats(n) }
  const addSub     = async () => { const n = [...subcats, '']; setSubcats(n); await categoryService.update(cat.id, { subcategories: n }) }
  const deleteSub  = async (idx: number) => { const n = subcats.filter((_, i) => i !== idx); setSubcats(n); await categoryService.update(cat.id, { subcategories: n }) }
  const changeIcon = async (icon: string) => { await categoryService.update(cat.id, { icon }) }
  const handleSoftDelete = async () => {
    const msg = assetCount > 0 ? `"${cat.name}" has ${assetCount} assets. They'll become uncategorized. Delete anyway?` : `Delete "${cat.name}"?`
    if (!window.confirm(msg)) return
    await categoryService.softDelete(cat.id)
  }

  return (
    <div style={{
      background: 'var(--surface-section)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 10, marginBottom: 8, overflow: 'hidden',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
        <IconPicker value={cat.icon} onChange={changeIcon} />
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={() => saveName(name)}
          style={{ ...inputSt, flex: 1 }}
        />
        <span style={{ fontSize: 12, color: 'var(--text-color-secondary)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
          {assetCount} assets
        </span>
        <button
          onClick={handleSoftDelete}
          style={{
            width: 30, height: 30, borderRadius: 7, border: 'none',
            background: 'transparent', cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-color-secondary)',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-color-secondary)'; e.currentTarget.style.background = 'transparent' }}
        >
          <i className="pi pi-trash" style={{ fontSize: 13 }} />
        </button>
      </div>

      {/* Subcategories */}
      {subcats.length > 0 && (
        <div style={{ padding: '0 12px 8px 62px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {subcats.map((sub, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                value={sub}
                onChange={e => updateSub(i, e.target.value)}
                onBlur={() => saveSubcats(subcats)}
                placeholder="Subcategory name"
                style={{ ...inputSt, fontSize: 12 }}
              />
              <button
                onClick={() => deleteSub(i)}
                style={{
                  width: 26, height: 26, borderRadius: 6, border: 'none', flexShrink: 0,
                  background: 'transparent', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-color-secondary)',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-color-secondary)' }}
              >
                <i className="pi pi-times" style={{ fontSize: 11 }} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: '0 12px 10px 62px' }}>
        <button
          type="button"
          onClick={addSub}
          style={{
            background: 'transparent', fontFamily: 'inherit', fontSize: 12,
            border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 6,
            padding: '3px 12px', color: 'var(--text-color-secondary)', cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#4f8fff'; e.currentTarget.style.borderColor = 'rgba(79,143,255,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-color-secondary)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
        >
          + Add Subcategory
        </button>
      </div>
    </div>
  )
}

// ── Care section (accordion) ──────────────────────────────────────────────────
const CareSection = ({ cat }: { cat: Category }) => {
  const [open, setOpen] = useState(false)
  const tasks: CareTask[] = cat.careTasks ?? []

  const updateTask = async (idx: number, patch: Partial<CareTask>) => {
    const updated = tasks.map((t, i) => i === idx ? { ...t, ...patch } : t)
    await categoryService.update(cat.id, { careTasks: updated })
  }
  const addTask = async () => {
    const newTask: CareTask = { id: newId(), task: 'New Task', freq: 'monthly', description: '' }
    await categoryService.update(cat.id, { careTasks: [...tasks, newTask] })
    setOpen(true)
  }
  const deleteTask = async (idx: number) => {
    await categoryService.update(cat.id, { careTasks: tasks.filter((_, i) => i !== idx) })
  }

  return (
    <div style={{
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 10, marginBottom: 8, overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', background: 'var(--surface-section)',
          border: 'none', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <i className={cat.icon} style={{ fontSize: 15, color: 'var(--text-color-secondary)', flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-color)' }}>{cat.name}</span>
        <span style={{ fontSize: 12, color: 'var(--text-color-secondary)', marginLeft: 4 }}>{tasks.length} tasks</span>
        <i className={`pi pi-chevron-${open ? 'up' : 'down'}`} style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-color-secondary)' }} />
      </button>

      {open && (
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map((task, i) => (
            <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                value={task.task}
                onChange={e => updateTask(i, { task: e.target.value })}
                onBlur={e => updateTask(i, { task: e.target.value })}
                placeholder="Task name"
                style={{ ...inputSt, flex: 2, minWidth: 0 }}
              />
              <select
                value={task.freq}
                onChange={e => updateTask(i, { freq: e.target.value as CareTask['freq'] })}
                style={{ ...inputSt, width: 130, flexShrink: 0, cursor: 'pointer' }}
              >
                {CARE_FREQUENCY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value} style={{ background: 'var(--surface-card)' }}>{o.label}</option>
                ))}
              </select>
              <input
                value={task.description}
                onChange={e => updateTask(i, { description: e.target.value })}
                onBlur={e => updateTask(i, { description: e.target.value })}
                placeholder="Notes (optional)"
                style={{ ...inputSt, flex: 2, minWidth: 0 }}
              />
              <button
                onClick={() => deleteTask(i)}
                style={{
                  width: 28, height: 28, borderRadius: 6, border: 'none', flexShrink: 0,
                  background: 'transparent', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-color-secondary)',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-color-secondary)' }}
              >
                <i className="pi pi-times" style={{ fontSize: 11 }} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addTask}
            style={{
              background: 'transparent', fontFamily: 'inherit', fontSize: 12,
              border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 6,
              padding: '3px 12px', color: 'var(--text-color-secondary)', cursor: 'pointer',
              alignSelf: 'flex-start',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#4f8fff'; e.currentTarget.style.borderColor = 'rgba(79,143,255,0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-color-secondary)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
          >
            + Add Task
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
const OptionsPage = () => {
  const { setTitle, clearTitle } = useTopbarTitle()
  const { settings }   = useSettings()
  const { categories } = useCategories()
  const { assets }     = useAssets()
  const { rooms }      = useMapRooms()
  const { can }        = usePermissions()

  useEffect(() => { setTitle('Options'); return clearTitle }, [])

  const [appForm, setAppForm]     = useState<AppSettings>(settings)
  const [appSaving, setAppSaving] = useState(false)
  const [appSaved,  setAppSaved]  = useState(false)
  useEffect(() => setAppForm(settings), [settings])

  const setApp = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) =>
    setAppForm(p => ({ ...p, [k]: v }))

  const saveApp = async () => {
    setAppSaving(true)
    const ok = await settingsService.save(appForm)
    setAppSaving(false)
    if (ok) { setAppSaved(true); setTimeout(() => setAppSaved(false), 2500) }
  }

  const jsonInputRef = useRef<HTMLInputElement>(null)
  const [importingJSON, setImportingJSON] = useState(false)

  const handleJSONImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    e.target.value = ''
    let data: { assets?: unknown[]; categories?: unknown[] }
    try { data = JSON.parse(await file.text()) }
    catch { alert('Invalid JSON file.'); return }
    if (!data.assets && !data.categories) { alert('No assets or categories found.'); return }
    const aCt = data.assets?.length ?? 0, cCt = data.categories?.length ?? 0
    if (!window.confirm(`Import ${aCt} assets and ${cCt} categories? Existing records will be overwritten.`)) return
    setImportingJSON(true)
    try {
      if (data.categories) {
        for (const c of data.categories as Record<string, unknown>[]) {
          const { id, createdAt: _ca, updatedAt: _ua, ...rest } = c
          await setDoc(doc(db, 'categories', id as string), { ...rest, updatedAt: serverTimestamp() }, { merge: true })
        }
      }
      if (data.assets) {
        for (const a of data.assets as Record<string, unknown>[]) {
          const { id, createdAt: _ca, updatedAt: _ua, purchaseDate, warrantyExpiry, ...rest } = a
          await setDoc(doc(db, 'assets', id as string), {
            ...rest,
            purchaseDate:   purchaseDate   ? Timestamp.fromDate(new Date(purchaseDate as string))   : serverTimestamp(),
            warrantyExpiry: warrantyExpiry  ? Timestamp.fromDate(new Date(warrantyExpiry as string))  : null,
            careCompletions: {}, updatedAt: serverTimestamp(),
          }, { merge: true })
        }
      }
      alert(`Import complete: ${aCt} assets, ${cCt} categories restored.`)
    } catch { alert('Import failed.') }
    setImportingJSON(false)
  }

  const [resettingMap, setResettingMap] = useState(false)
  const DEFAULT_MAP_ROOMS = [
    { label: 'Room 101', icon: '🏫', color: 'blue' as const, floor: 'Main Building — Floor 1', x: 30, y: 40, w: 100, h: 70 },
    { label: 'Library',  icon: '📚', color: 'purple' as const, floor: 'Main Building — Floor 1', x: 145, y: 40, w: 130, h: 70 },
    { label: 'Gymnasium',icon: '🏃', color: 'green' as const, floor: 'Main Building — Floor 1', x: 375, y: 40, w: 140, h: 130 },
    { label: 'Main Office', icon: '🗂', color: 'blue' as const, floor: 'Main Building — Floor 1', x: 30, y: 220, w: 130, h: 70 },
    { label: 'Server Room', icon: '🖥', color: 'purple' as const, floor: 'Main Building — Floor 1', x: 290, y: 130, w: 100, h: 70 },
  ]
  const handleResetMap = async () => {
    if (!window.confirm('Delete all map rooms and restore defaults?')) return
    setResettingMap(true)
    for (const r of rooms) await mapRoomService.delete(r.id)
    for (const r of DEFAULT_MAP_ROOMS) await mapRoomService.create(r)
    setResettingMap(false)
  }

  const exportCSV = () => {
    const active = assets.filter(a => !a.isDeleted)
    const headers = ['Name','Category','Status','Serial','Asset Tag','Purchase Date','Purchase Price','Lifespan','Location','Assigned To','Notes']
    const rows = active.map(a => [a.name,a.categoryId,a.status,a.serialNumber,a.assetTag,a.purchaseDate?.toDate().toLocaleDateString(),a.purchasePrice,a.lifespanYears,a.location,a.assignedTo,a.notes])
    const csv = [headers,...rows].map(r => r.map(v => `"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
    Object.assign(document.createElement('a'),{href:url,download:'techtrack_assets.csv'}).click()
    URL.revokeObjectURL(url)
  }

  const exportJSON = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      assets: assets.map(a => ({...a, purchaseDate: a.purchaseDate?.toDate().toISOString(), createdAt: a.createdAt?.toDate().toISOString(), updatedAt: a.updatedAt?.toDate().toISOString()})),
      categories: categories.map(c => ({...c, createdAt: c.createdAt?.toDate().toISOString(), updatedAt: c.updatedAt?.toDate().toISOString()})),
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}))
    Object.assign(document.createElement('a'),{href:url,download:'techtrack_backup.json'}).click()
    URL.revokeObjectURL(url)
  }

  const activeCategories = categories.filter(c => !c.isDeleted)
  const assetCountByCat  = (catId: string) => assets.filter(a => !a.isDeleted && a.categoryId === catId).length

  const [newIcon, setNewIcon] = useState('pi pi-box')
  const [newName, setNewName] = useState('')
  const [adding, setAdding]   = useState(false)

  const handleAddCat = async () => {
    if (!newName.trim()) return
    setAdding(true)
    await categoryService.create({ name: newName.trim(), icon: newIcon, colorKey: 'blue', subcategories: [], careTasks: [] })
    setNewName(''); setNewIcon('pi pi-box')
    setAdding(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1200 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-color)' }}>⚙ Options & Settings</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-color-secondary)' }}>
          Edit categories, subcategories, app name, and data management
        </div>
      </div>

      {/* Top 2-col row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* App Name */}
        {can('manage_settings') && (
          <div style={card}>
            <CardHeader icon="🗂">App Name</CardHeader>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <Label>App Title</Label>
                <input value={appForm.appTitle} onChange={e => setApp('appTitle', e.target.value)} style={inputSt} />
              </div>
              <div>
                <Label>Subtitle</Label>
                <input value={appForm.appSubtitle} onChange={e => setApp('appSubtitle', e.target.value)} style={inputSt} />
              </div>
              <div>
                <Label>School A Name</Label>
                <input value={appForm.schoolAName} onChange={e => setApp('schoolAName', e.target.value)} placeholder="e.g. Lincoln Elementary" style={inputSt} />
              </div>
              <div>
                <Label>School B Name</Label>
                <input value={appForm.schoolBName} onChange={e => setApp('schoolBName', e.target.value)} placeholder="e.g. Roosevelt Middle School" style={inputSt} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                <button
                  onClick={saveApp}
                  disabled={appSaving}
                  style={{
                    padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
                    background: 'var(--primary-color)', color: '#fff',
                    fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                    opacity: appSaving ? 0.7 : 1,
                    boxShadow: '0 1px 3px rgba(79,143,255,0.3)',
                  }}
                >
                  {appSaving ? 'Saving…' : 'Save Settings'}
                </button>
                {appSaved && (
                  <span style={{ fontSize: 13, color: '#22c55e' }}>
                    <i className="pi pi-check" style={{ marginRight: 4 }} />Saved!
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Data Management */}
        <div style={card}>
          <CardHeader icon="💾">Data Management</CardHeader>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ActionBtn icon="↓" label="Export Assets as CSV"      onClick={exportCSV}  />
            <ActionBtn icon="↓" label="Export Full Backup (JSON)" onClick={exportJSON} />
            <ActionBtn
              icon="↑" label={importingJSON ? 'Importing…' : 'Import from JSON Backup'}
              onClick={() => jsonInputRef.current?.click()} disabled={importingJSON}
            />
            <input ref={jsonInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleJSONImport} />
            <ActionBtn
              icon="🗺" label={resettingMap ? 'Resetting…' : 'Reset Map to Default Rooms'}
              onClick={handleResetMap} disabled={resettingMap}
            />
            {can('import_data') && (
              <ActionBtn
                icon="🗑" label="Reset All Data" danger
                onClick={() => { if (window.confirm('This will permanently delete ALL data. Are you absolutely sure?')) alert('Contact your system administrator to perform a full data reset.') }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Categories & Subcategories */}
      <div style={card}>
        <CardHeader icon="📋">Categories & Subcategories</CardHeader>
        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--text-color-secondary)', margin: '0 0 16px' }}>
            Edit icons, rename, add/delete categories and subcategories. All changes apply everywhere instantly.
          </p>
          <div style={{ maxHeight: 520, overflowY: 'auto', paddingRight: 4 }}>
            {activeCategories.map(cat => (
              <CategoryRow key={cat.id} cat={cat} assetCount={assetCountByCat(cat.id)} />
            ))}
          </div>

          {/* Add new category */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            paddingTop: 14, marginTop: 6,
            borderTop: '1px solid rgba(255,255,255,0.07)',
          }}>
            <IconPicker value={newIcon} onChange={setNewIcon} />
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCat()}
              placeholder="New category name..."
              style={{ ...inputSt, flex: 1 }}
            />
            <button
              onClick={handleAddCat}
              disabled={adding || !newName.trim()}
              style={{
                padding: '9px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                background: 'var(--primary-color)', color: '#fff',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                opacity: adding || !newName.trim() ? 0.4 : 1,
                whiteSpace: 'nowrap', flexShrink: 0,
                boxShadow: '0 1px 3px rgba(79,143,255,0.3)',
              }}
            >
              {adding ? '…' : '+ Add Category'}
            </button>
          </div>
        </div>
      </div>

      {/* Default Care Schedules */}
      <div style={card}>
        <CardHeader icon="📅">Default Care Schedules</CardHeader>
        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--text-color-secondary)', margin: '0 0 16px' }}>
            Each category has default maintenance tasks. These apply to new assets and can be overridden per asset.
          </p>
          {activeCategories.map(cat => (
            <CareSection key={cat.id} cat={cat} />
          ))}
        </div>
      </div>

    </div>
  )
}

export default OptionsPage
