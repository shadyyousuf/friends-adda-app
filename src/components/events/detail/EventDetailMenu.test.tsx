/** @vitest-environment jsdom */

import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EventDetailMenu, { getEventMenuItems } from './EventDetailMenu'

describe('EventDetailMenu', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders Close Event before Delete event with success styling', () => {
    const items = getEventMenuItems('general', true, true, true, true, false)

    render(
      <EventDetailMenu
        isOpen
        items={items}
        onToggle={vi.fn()}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />,
    )

    const menu = screen.getByRole('menu', { name: 'Event actions' })
    const buttons = within(menu).getAllByRole('button')
    const labels = buttons.map((button) => button.textContent?.trim())
    const closeButton = buttons.find(
      (button) => button.textContent?.trim() === 'Close Event',
    )

    expect(labels).toEqual([
      'Edit event',
      'Members',
      'Add Friend',
      'Close Event',
      'Delete event',
    ])
    expect(closeButton?.className).toContain('is-success')
  })

  it('omits Close Event and Delete event when the event is already closed', () => {
    const items = getEventMenuItems('fund_tracker', true, true, true, true, true)

    render(
      <EventDetailMenu
        isOpen
        items={items}
        onToggle={vi.fn()}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />,
    )

    const menu = screen.getByRole('menu', { name: 'Event actions' })
    const labels = within(menu)
      .getAllByRole('button')
      .map((button) => button.textContent?.trim())

    expect(labels).toEqual(['Event details', 'Leaderboard', 'Members', 'Add Friend'])
  })
})
