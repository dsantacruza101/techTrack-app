import { useState } from 'react'
import { categoryService } from '../services/categoryService'
import type { CategoryFormData } from '../types/category.types'

interface UseCategoryMutationsReturn {
  saving: boolean
  deleting: boolean
  create: (data: CategoryFormData) => Promise<boolean>
  update: (id: string, data: Partial<CategoryFormData>) => Promise<boolean>
  softDelete: (id: string) => Promise<boolean>
  restore: (id: string) => Promise<boolean>
}

/**
 * Wraps categoryService mutations with loading state.
 * Returns true on success, false on error — caller handles Toast. (SRP)
 */
export const useCategoryMutations = (): UseCategoryMutationsReturn => {
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const create = async (data: CategoryFormData): Promise<boolean> => {
    setSaving(true)
    try {
      await categoryService.create(data)
      return true
    } catch {
      return false
    } finally {
      setSaving(false)
    }
  }

  const update = async (id: string, data: Partial<CategoryFormData>): Promise<boolean> => {
    setSaving(true)
    try {
      await categoryService.update(id, data)
      return true
    } catch {
      return false
    } finally {
      setSaving(false)
    }
  }

  const softDelete = async (id: string): Promise<boolean> => {
    setDeleting(true)
    try {
      await categoryService.softDelete(id)
      return true
    } catch {
      return false
    } finally {
      setDeleting(false)
    }
  }

  const restore = async (id: string): Promise<boolean> => {
    setSaving(true)
    try {
      await categoryService.restore(id)
      return true
    } catch {
      return false
    } finally {
      setSaving(false)
    }
  }

  return { saving, deleting, create, update, softDelete, restore }
}
