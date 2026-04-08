import { useState } from 'react'
import { workOrderService } from '../services/workOrderService'
import type { WorkOrder, WorkOrderFormData } from '../types/workOrder.types'

export const useWorkOrderMutations = () => {
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  const create = async (data: WorkOrderFormData): Promise<boolean> => {
    setSaving(true)
    const ok = await workOrderService.create(data)
    setSaving(false)
    return ok
  }

  const update = async (id: string, data: Partial<WorkOrderFormData>): Promise<boolean> => {
    setSaving(true)
    const ok = await workOrderService.update(id, data)
    setSaving(false)
    return ok
  }

  const updateStatus = async (id: string, status: WorkOrder['status']): Promise<boolean> => {
    return workOrderService.updateStatus(id, status)
  }

  const remove = async (id: string): Promise<boolean> => {
    setDeleting(true)
    const ok = await workOrderService.delete(id)
    setDeleting(false)
    return ok
  }

  return { saving, deleting, create, update, updateStatus, remove }
}
