export type RoomColor = 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'orange' | 'cyan'

export const ROOM_COLOR_OPTIONS: { label: string; value: RoomColor; hex: string }[] = [
  { label: 'Blue',   value: 'blue',   hex: '#4f8fff' },
  { label: 'Green',  value: 'green',  hex: '#22c55e' },
  { label: 'Purple', value: 'purple', hex: '#7c3aed' },
  { label: 'Yellow', value: 'yellow', hex: '#f59e0b' },
  { label: 'Red',    value: 'red',    hex: '#ef4444' },
  { label: 'Orange', value: 'orange', hex: '#f97316' },
  { label: 'Cyan',   value: 'cyan',   hex: '#06b6d4' },
]

export interface MapRoom {
  id: string
  label: string
  icon: string
  color: RoomColor
  floor: string
  x: number
  y: number
  w: number
  h: number
}

export type MapRoomFormData = Omit<MapRoom, 'id'>
