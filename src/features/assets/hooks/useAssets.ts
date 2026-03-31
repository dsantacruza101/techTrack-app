import { useEffect, useState } from 'react'
import { assetService } from '../services/assetService'
import type { Asset } from '../types/asset.types'

interface UseAssetsReturn {
  assets: Asset[]   // active (non-deleted) only
  loading: boolean
}

/**
 * Real-time subscription to active (non-deleted) assets.
 * Used by the sidebar for counts and total value.
 */
export const useAssets = (): UseAssetsReturn => {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = assetService.subscribeToActive((data) => {
      setAssets(data)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return { assets, loading }
}
