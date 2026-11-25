import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ActivityTimeline from './ActivityTimeline';

describe('ActivityTimeline', () => {
  it('renders activity details and timestamps', () => {
    render(
      <ActivityTimeline
        items={[{
          id: 1,
          title: 'APPLIED → SCREENING',
          description: 'Initial screening completed.',
          actorLabel: 'User #4',
          occurredAt: '2026-11-25T10:00:00Z',
        }]}
      />,
    );

    expect(screen.getByRole('list', { name: 'Activity timeline' })).toBeTruthy();
    expect(screen.getByText('APPLIED → SCREENING')).toBeTruthy();
    expect(screen.getByText('Initial screening completed.')).toBeTruthy();
    expect(screen.getByText(/User #4/)).toBeTruthy();
    expect(screen.getByText(/2026/)).toBeTruthy();
  });

  it('shows loading, error, and empty states', () => {
    const { rerender } = render(<ActivityTimeline loading />);
    expect(screen.getByRole('status').textContent).toContain('Loading activity');

    rerender(<ActivityTimeline error="History is unavailable." />);
    expect(screen.getByRole('alert').textContent).toBe('History is unavailable.');

    rerender(<ActivityTimeline items={[]} emptyMessage="No events yet." />);
    expect(screen.getByText('No events yet.')).toBeTruthy();
  });
});
