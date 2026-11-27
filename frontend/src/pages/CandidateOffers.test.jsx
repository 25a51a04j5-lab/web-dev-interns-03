import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CandidateOffers from './CandidateOffers';

const { api } = vi.hoisted(() => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../api/client', () => ({ api }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function issuedOffer() {
  return {
    offer: {
      id: 17,
      applicationId: 42,
      status: 'ISSUED',
      issuedAt: '2026-11-27T10:00:00Z',
      terms: {
        position: 'Software Engineer',
        compensation: 'As agreed',
        startDate: '2027-01-15',
        expiresAt: '2026-12-10',
      },
    },
    preview: 'Employment offer for Software Engineer.',
  };
}

describe('CandidateOffers', () => {
  it('loads and displays an issued offer for an application', async () => {
    api.get.mockResolvedValue(issuedOffer());
    render(<CandidateOffers />);

    fireEvent.change(screen.getByLabelText('Application ID'), {
      target: { value: '42' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'View offer' }));

    expect(await screen.findByText('Software Engineer')).toBeTruthy();
    expect(screen.getByText('ISSUED')).toBeTruthy();
    expect(screen.getByText('Employment offer for Software Engineer.')).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith('/applications/42/offer');
  });

  it('requires confirmation before accepting an offer and locks the response after success', async () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    api.get.mockResolvedValue(issuedOffer());
    api.post.mockResolvedValue({
      offer: { ...issuedOffer().offer, status: 'ACCEPTED', respondedAt: '2026-11-27T11:00:00Z' },
    });
    render(<CandidateOffers />);

    fireEvent.change(screen.getByLabelText('Application ID'), {
      target: { value: '42' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'View offer' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Accept offer' }));

    expect(confirm).toHaveBeenCalledOnce();
    expect(api.post).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    fireEvent.change(screen.getByLabelText('Note to HR (optional)'), {
      target: { value: 'Thank you. I accept.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Accept offer' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/offers/17/respond', {
        decision: 'ACCEPTED',
        responseNote: 'Thank you. I accept.',
      });
    });
    expect(await screen.findByText('You accepted the offer.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Decline offer' })).toBeNull();
  });

  it('does not expose response controls once the offer is declined', async () => {
    api.get.mockResolvedValue({
      offer: { ...issuedOffer().offer, status: 'DECLINED' },
      preview: issuedOffer().preview,
    });
    render(<CandidateOffers />);

    fireEvent.change(screen.getByLabelText('Application ID'), {
      target: { value: '42' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'View offer' }));

    expect(await screen.findByText('You have declined this offer.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Accept offer' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Decline offer' })).toBeNull();
  });

  it('reports server errors instead of claiming an offer was loaded', async () => {
    api.get.mockRejectedValue(new Error('Offer not found'));
    render(<CandidateOffers />);

    fireEvent.change(screen.getByLabelText('Application ID'), {
      target: { value: '42' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'View offer' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Offer not found');
    expect(screen.queryByRole('button', { name: 'Accept offer' })).toBeNull();
  });
});
