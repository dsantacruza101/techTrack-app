import { useState, useEffect } from 'react'
import { mapRoomService } from '../services/mapRoomService'
import type { MapRoom } from '../types/mapRoom.types'

export const useMapRooms = () => {
  const [rooms, setRooms]     = useState<MapRoom[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = mapRoomService.subscribeToAll(
      data => { setRooms(data); setLoading(false) },
      ()   => { setLoading(false) },
    )
    return unsub
  }, [])

  return { rooms, loading }
}
