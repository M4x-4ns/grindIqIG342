import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BeanForm } from './BeanForm'
import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig } from '@/types/grinder'

const grinders: GrinderConfig[] = [
  { id: 'grinder-a', label: 'Junior', roastLevel: 'light', grinderType: 'stepped', baselineGrind: 18, tempCoefficient: 0.15, humidityCoefficient: 0.05, isActive: true },
]

const existingBean: BeanProfile = {
  id: 'b1',
  name: 'Ethiopia Yirgacheffe',
  origin: 'Ethiopia',
  agtron: 78,
  roastLevel: 'light',
  baselineGrinds: { 'grinder-a': 18 },
  baselineTemp: 25,
  baselineHumidity: 60,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
}

// --- Add mode ---
describe('BeanForm — add mode', () => {
  it('shows "Add Bean" primary button', () => {
    render(<BeanForm grinders={grinders} onSave={vi.fn()} />)
    expect(screen.getByRole('button', { name: /add bean/i })).toBeTruthy()
  })

  it('primary button is disabled when required fields are empty', () => {
    render(<BeanForm grinders={grinders} onSave={vi.fn()} />)
    expect(screen.getByRole('button', { name: /add bean/i })).toBeDisabled()
  })

  it('does not show Hide or Delete buttons in add mode', () => {
    render(<BeanForm grinders={grinders} onSave={vi.fn()} />)
    expect(screen.queryByText(/hide bean/i)).toBeNull()
    expect(screen.queryByText(/delete permanently/i)).toBeNull()
  })

  it('calls onSave with a generated UUID and all fields when valid form is submitted', async () => {
    const onSave = vi.fn()
    render(<BeanForm grinders={grinders} onSave={onSave} />)
    await userEvent.type(screen.getByLabelText(/^name$/i), 'New Bean')
    await userEvent.type(screen.getByLabelText(/^origin$/i), 'Ethiopia')
    await userEvent.clear(screen.getByLabelText(/^agtron$/i))
    await userEvent.type(screen.getByLabelText(/^agtron$/i), '70')
    await userEvent.clear(screen.getByLabelText(/^junior$/i))
    await userEvent.type(screen.getByLabelText(/^junior$/i), '18')
    await userEvent.clear(screen.getByLabelText(/temp/i))
    await userEvent.type(screen.getByLabelText(/temp/i), '25')
    await userEvent.clear(screen.getByLabelText(/humidity/i))
    await userEvent.type(screen.getByLabelText(/humidity/i), '60')
    await userEvent.click(screen.getByRole('button', { name: /add bean/i }))
    expect(onSave).toHaveBeenCalledOnce()
    const [savedBean] = onSave.mock.calls[0] as [BeanProfile]
    expect(savedBean.name).toBe('New Bean')
    expect(savedBean.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/)  // UUID prefix
    expect(savedBean.createdAt).toBeTruthy()
    expect(savedBean.baselineGrinds['grinder-a']).toBe(18)
  })
})

// --- Edit mode ---
describe('BeanForm — edit mode', () => {
  it('pre-fills name and origin from initialBean', () => {
    render(<BeanForm initialBean={existingBean} grinders={grinders} onSave={vi.fn()} />)
    expect((screen.getByLabelText(/^name$/i) as HTMLInputElement).value).toBe('Ethiopia Yirgacheffe')
    expect((screen.getByLabelText(/^origin$/i) as HTMLInputElement).value).toBe('Ethiopia')
  })

  it('shows "Save Changes" button in edit mode', () => {
    render(<BeanForm initialBean={existingBean} grinders={grinders} onSave={vi.fn()} />)
    expect(screen.getByRole('button', { name: /save changes/i })).toBeTruthy()
  })

  it('shows Hide and Delete buttons in edit mode', () => {
    render(<BeanForm initialBean={existingBean} grinders={grinders} onSave={vi.fn()} onHide={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText(/hide bean/i)).toBeTruthy()
    expect(screen.getByText(/delete permanently/i)).toBeTruthy()
  })

  it('calls onHide when Hide button clicked', async () => {
    const onHide = vi.fn()
    render(<BeanForm initialBean={existingBean} grinders={grinders} onSave={vi.fn()} onHide={onHide} onDelete={vi.fn()} />)
    await userEvent.click(screen.getByText(/hide bean/i))
    expect(onHide).toHaveBeenCalledOnce()
  })

  it('shows confirmation text after first Delete click', async () => {
    render(<BeanForm initialBean={existingBean} grinders={grinders} onSave={vi.fn()} onHide={vi.fn()} onDelete={vi.fn()} />)
    await userEvent.click(screen.getByText(/delete permanently/i))
    expect(screen.getByText(/are you sure/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /confirm delete/i })).toBeTruthy()
  })

  it('calls onDelete after Confirm Delete clicked', async () => {
    const onDelete = vi.fn()
    render(<BeanForm initialBean={existingBean} grinders={grinders} onSave={vi.fn()} onHide={vi.fn()} onDelete={onDelete} />)
    await userEvent.click(screen.getByText(/delete permanently/i))
    await userEvent.click(screen.getByRole('button', { name: /confirm delete/i }))
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('cancels confirmation state when clicking outside the confirm row', async () => {
    render(
      <div>
        <BeanForm initialBean={existingBean} grinders={grinders} onSave={vi.fn()} onHide={vi.fn()} onDelete={vi.fn()} />
        <div data-testid="outside">Outside</div>
      </div>
    )
    await userEvent.click(screen.getByText(/delete permanently/i))
    expect(screen.getByText(/are you sure/i)).toBeTruthy()
    // Click the outside element — triggers the mousedown handler
    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(screen.queryByText(/are you sure/i)).toBeNull()
  })
})

// --- Validation ---
describe('BeanForm — validation', () => {
  it('shows agtron error on blur when value is out of range', async () => {
    render(<BeanForm grinders={grinders} onSave={vi.fn()} />)
    const agtronInput = screen.getByLabelText(/^agtron$/i)
    await userEvent.type(agtronInput, '200')
    fireEvent.blur(agtronInput)
    expect(screen.getByText(/0.*100/i)).toBeTruthy()
  })
})
