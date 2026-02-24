import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoriesPage } from '@/features/categories/categories-page'
import { initializeDatabase, resetDatabase } from '@/lib/db'

describe('CategoriesPage', () => {
  beforeEach(async () => {
    await resetDatabase()
    await initializeDatabase()
  })

  it('creates a custom category and renders it in the list', async () => {
    const user = userEvent.setup()
    render(<CategoriesPage />)

    await waitFor(() => {
      expect(screen.getByText('Shirts')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText('Name'), 'Workwear')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(screen.getByText('Workwear')).toBeInTheDocument()
    })
  })
})

