import { useState, useEffect } from 'react'
import { inventoryService } from '../services/inventoryService'
import type { InventoryItem } from '../types/inventory.types'

export const useInventory = () => {
  const [items, setItems]   = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = inventoryService.subscribeToActive(
      data => { setItems(data); setLoading(false) },
      ()   => { setLoading(false) },
    )
    return unsub
  }, [])

  return { items, loading }
}
