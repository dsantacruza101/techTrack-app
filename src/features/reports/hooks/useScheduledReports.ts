import { useState, useEffect } from 'react'
import { scheduledReportService } from '../services/scheduledReportService'
import type { ScheduledReport } from '../types/scheduledReport.types'

export const useScheduledReports = () => {
  const [reports, setReports] = useState<ScheduledReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = scheduledReportService.subscribeToActive(data => {
      setReports(data)
      setLoading(false)
    })
    return unsub
  }, [])

  return { reports, loading }
}
