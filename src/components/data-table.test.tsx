import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table'
import { renderWithProviders } from '@/test/utils'

interface Row {
  name: string
}
const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: 'name', header: 'Name', cell: ({ row }) => row.original.name },
]

describe('DataTable', () => {
  it('renders rows of data', () => {
    renderWithProviders(
      <DataTable columns={columns} data={[{ name: 'Alpha' }, { name: 'Beta' }]} />,
    )
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('renders the empty slot when there is no data', () => {
    renderWithProviders(
      <DataTable columns={columns} data={[]} empty={<div>NO_DATA</div>} />,
    )
    expect(screen.getByText('NO_DATA')).toBeInTheDocument()
  })

  it('shows skeletons while loading (not the empty slot)', () => {
    const { container } = renderWithProviders(
      <DataTable
        columns={columns}
        data={[]}
        loading
        empty={<div>NO_DATA</div>}
      />,
    )
    expect(screen.queryByText('NO_DATA')).not.toBeInTheDocument()
    expect(container.querySelector('.animate-pulse')).toBeTruthy()
  })
})
