import { useState, useEffect } from 'react'
import { itTicketService } from '../services/itTicketService'
import type { ITTicket } from '../types/itTicket.types'

export const useITTickets = () => {
  const [tickets, setTickets] = useState<ITTicket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = itTicketService.subscribeToAll(
      items => { setTickets(items); setLoading(false) },
      ()     => { setLoading(false) },
    )
    return unsub
  }, [])

  return { tickets, loading }
}
