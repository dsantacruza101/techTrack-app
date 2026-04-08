import { useState } from 'react'
import { itTicketService } from '../services/itTicketService'
import type { ITTicketFormData } from '../types/itTicket.types'

export const useITTicketMutations = () => {
  const [saving, setSaving] = useState(false)

  const create = async (data: ITTicketFormData): Promise<boolean> => {
    setSaving(true)
    const ok = await itTicketService.create(data)
    setSaving(false)
    return ok
  }

  const update = async (id: string, data: Partial<ITTicketFormData>): Promise<boolean> => {
    setSaving(true)
    const ok = await itTicketService.update(id, data)
    setSaving(false)
    return ok
  }

  return { saving, create, update }
}
