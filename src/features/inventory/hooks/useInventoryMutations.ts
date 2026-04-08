import { useState } from 'react'
import { inventoryService } from '../services/inventoryService'
import type { InventoryItemFormData } from '../types/inventory.types'

export const useInventoryMutations = () => {
  const [saving, setSaving] = useState(false)

  const create = async (data: InventoryItemFormData): Promise<boolean> => {
    setSaving(true)
    const ok = await inventoryService.create(data)
    setSaving(false)
    return ok
  }

  const update = async (id: string, data: Partial<InventoryItemFormData>): Promise<boolean> => {
    setSaving(true)
    const ok = await inventoryService.update(id, data)
    setSaving(false)
    return ok
  }

  const softDelete = async (id: string): Promise<boolean> => {
    return inventoryService.softDelete(id)
  }

  const logStock = async (itemId: string, change: number, note: string, createdBy: string): Promise<boolean> => {
    setSaving(true)
    const ok = await inventoryService.logStockChange(itemId, change, note, createdBy)
    setSaving(false)
    return ok
  }

  return { saving, create, update, softDelete, logStock }
}
