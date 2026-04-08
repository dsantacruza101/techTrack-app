import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../../../firebase/config'
import type { StockLog } from '../types/inventory.types'

export const useStockLogs = (itemId: string | null) => {
  const [logs, setLogs]     = useState<StockLog[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!itemId) { setLogs([]); return }
    setLoading(true)
    const q = query(
      collection(db, 'inventory', itemId, 'logs'),
      orderBy('createdAt', 'desc'),
    )
    const unsub = onSnapshot(
      q,
      snap => {
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as StockLog & { id: string })))
        setLoading(false)
      },
      () => setLoading(false),
    )
    return unsub
  }, [itemId])

  return { logs, loading }
}
