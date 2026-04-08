import {
  collection, addDoc, deleteDoc, doc,
  query, where, onSnapshot, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '../../../firebase/config'
import {
  computeNextSendAt,
  type ScheduledReport,
  type ReportType,
  type ReportFrequency,
} from '../types/scheduledReport.types'

const COL = 'scheduledReports'

const toReport = (id: string, d: Record<string, unknown>): ScheduledReport => ({
  id,
  reportType:     d.reportType     as ReportType,
  frequency:      d.frequency      as ReportFrequency,
  recipientEmail: d.recipientEmail as string,
  createdAt:      d.createdAt      as Timestamp,
  createdBy:      d.createdBy      as string,
  lastSentAt:     (d.lastSentAt    as Timestamp) ?? null,
  nextSendAt:     d.nextSendAt     as Timestamp,
  isActive:       (d.isActive      as boolean) ?? true,
})

export const scheduledReportService = {
  subscribeToActive(cb: (items: ScheduledReport[]) => void): () => void {
    const q = query(collection(db, COL), where('isActive', '==', true))
    return onSnapshot(
      q,
      snap => cb(snap.docs.map(d => toReport(d.id, d.data() as Record<string, unknown>))),
      () => cb([]),
    )
  },

  async create(data: {
    reportType: ReportType
    frequency: ReportFrequency
    recipientEmail: string
    createdBy: string
  }): Promise<boolean> {
    try {
      await addDoc(collection(db, COL), {
        reportType:     data.reportType,
        frequency:      data.frequency,
        recipientEmail: data.recipientEmail,
        createdBy:      data.createdBy,
        createdAt:      serverTimestamp(),
        lastSentAt:     null,
        nextSendAt:     Timestamp.fromDate(computeNextSendAt(data.frequency)),
        isActive:       true,
      })
      return true
    } catch { return false }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, COL, id))
      return true
    } catch { return false }
  },
}
