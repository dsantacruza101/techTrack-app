import { useState } from 'react'
import { assetService } from '../services/assetService'
import type { Asset, AssetFormData } from '../types/asset.types'

export const useAssetMutations = () => {
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [replicating, setReplicating] = useState(false)

  const create = async (data: AssetFormData): Promise<boolean> => {
    setSaving(true)
    const ok = await assetService.create(data)
    setSaving(false)
    return ok
  }

  const update = async (id: string, data: Partial<AssetFormData>): Promise<boolean> => {
    setSaving(true)
    const ok = await assetService.update(id, data)
    setSaving(false)
    return ok
  }

  const softDelete = async (id: string): Promise<boolean> => {
    setDeleting(true)
    const ok = await assetService.softDelete(id)
    setDeleting(false)
    return ok
  }

  const restore = async (id: string): Promise<boolean> => {
    setSaving(true)
    const ok = await assetService.restore(id)
    setSaving(false)
    return ok
  }

  const replicate = async (asset: Asset): Promise<boolean> => {
    setReplicating(true)
    const ok = await assetService.replicate(asset)
    setReplicating(false)
    return ok
  }

  return { saving, deleting, replicating, create, update, softDelete, restore, replicate }
}
