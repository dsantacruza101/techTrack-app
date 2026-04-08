import { useState, useEffect } from 'react'
import { workOrderService } from '../services/workOrderService'
import type { WorkOrder } from '../types/workOrder.types'

export const useWorkOrders = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = workOrderService.subscribeToAll(
      items => { setWorkOrders(items); setLoading(false) },
      ()     => { setLoading(false) },
    )
    return unsub
  }, [])

  return { workOrders, loading }
}
