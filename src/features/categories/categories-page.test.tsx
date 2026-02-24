import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LocaleProvider } from '@/app/locale-provider'
import { CategoriesPage } from '@/features/categories/categories-page'
import { initializeDatabase, resetDatabase } from '@/lib/db'

describe('CategoriesPage', () => {
  beforeEach(async () => {
    localStorage.setItem('clothepickr-locale', 'en-US')
    await resetDatabase()
    await initializeDatabase()
  })

  it('creates a custom category and renders it in the list', async () => {
    const user = userEvent.setup()
    render(
      <LocaleProvider>
        <CategoriesPage />
      </LocaleProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('Shirts')).toBeTruthy()
    })

    await user.type(screen.getByLabelText('Name'), 'Workwear')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(screen.getByText('Workwear')).toBeTruthy()
    })
  })
})
