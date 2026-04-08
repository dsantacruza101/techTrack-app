import { useState, useEffect } from 'react'
import { settingsService } from '../services/settingsService'
import type { AppSettings } from '../types/settings.types'
import { DEFAULT_SETTINGS } from '../types/settings.types'

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const unsub = settingsService.subscribe(data => {
      setSettings(data)
      setLoading(false)
    })
    return unsub
  }, [])

  return { settings, loading }
}
