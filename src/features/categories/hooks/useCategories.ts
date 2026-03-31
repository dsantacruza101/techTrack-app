import { useEffect, useState } from 'react'
import { categoryService } from '../services/categoryService'
import type { Category } from '../types/category.types'

interface UseCategoriesReturn {
  categories: Category[]
  loading: boolean
}

/**
 * Real-time subscription to active (non-deleted) categories.
 * Used by the sidebar and asset forms.
 */
export const useCategories = (): UseCategoriesReturn => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = categoryService.subscribeToActive((data) => {
      setCategories(data)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  return { categories, loading }
}
