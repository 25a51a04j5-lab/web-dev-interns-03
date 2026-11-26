import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HROffers from './HROffers';

const { api } = vi.hoisted(() => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../api/client', () => ({ api }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function offerNotFound() {
  const error = new Error('Offer not found');
  error.status = 404;
  return error;
}

describe('HROffers', () => {
  it('saves a draft and shows the generated preview', async () => {
    api.get.mockImplementation((endpoint) => {
      if (endpoint === '/applications') {
        return Promise.resolve({
          applications: [{ id: 8, jobId: 3, stage: 'SELECTED' }],
        });
      }
      return Promise.reject(offerNotFound());
    });
    api.put.mockResolvedValue({
      offer: { id: 5, status: 'DRAFT', templateName: 'standard' },
      preview: 'Employment offer for Software Engineer.',
    });

    render(<HROffers />);

    fireEvent.change(await screen.findByLabelText('Compensation details'), {
      target: { value: 'As agreed' },
    });
    fireEvent.change(screen.getByLabelText('Position title'), {
      target: { value: 'Software Engineer' },
    });
    fireEvent.change(screen.getByLabelText('Expected start date'), {
      target: { value: '2027-01-15' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft & generate preview' }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/applications/8/offer', {
        templateName: 'standard',
        terms: {
          position: 'Software Engineer',
          compensation: 'As agreed',
          startDate: '2027-01-15',
          expiresAt: null,
        },
      });
    });
    expect(await screen.findByText('Employment offer for Software Engineer.')).toBeTruthy();
    expect(screen.getByText('Offer draft saved. Review the generated preview before issuing it.')).toBeTruthy();
  });

  it('confirms before issuing a saved draft and displays its issued status', async () => {
    const confirm = vi.fn(() => true);
    vi.stubGlobal('confirm', confirm);
    api.get.mockImplementation((endpoint) => {
      if (endpoint === '/applications') {
        return Promise.resolve({
          applications: [{ id: 9, jobId: 4, stage: 'OFFERED' }],
        });
      }
      return Promise.resolve({
        offer: {
          id: 6,
          status: 'DRAFT',
          templateName: 'standard',
          issuedAt: null,
          terms: {
            position: 'Product Engineer',
            compensation: 'As agreed',
            startDate: '2027-02-01',
            expiresAt: '',
          },
        },
        preview: 'Product Engineer offer preview',
      });
    });
    api.post.mockResolvedValue({
      offer: {
        id: 6,
        status: 'ISSUED',
        issuedAt: '2026-11-26T10:00:00Z',
        terms: {
          position: 'Product Engineer',
          compensation: 'As agreed',
          startDate: '2027-02-01',
        },
      },
    });

    render(<HROffers />);
    fireEvent.click(await screen.findByRole('button', { name: 'Issue offer' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/applications/9/offer/issue', {});
    });
    expect(confirm).toHaveBeenCalledOnce();
    expect(await screen.findByText('ISSUED')).toBeTruthy();
    expect(screen.getByText('Offer issued successfully.')).toBeTruthy();
  });

  it('only offers applications that reached selected or offered stages', async () => {
    api.get.mockImplementation((endpoint) => {
      if (endpoint === '/applications') {
        return Promise.resolve({
          applications: [
            { id: 1, jobId: 1, stage: 'SCREENING' },
            { id: 2, jobId: 2, stage: 'SELECTED' },
            { id: 3, jobId: 3, stage: 'OFFERED' },
          ],
        });
      }
      return Promise.reject(offerNotFound());
    });

    render(<HROffers />);

    const picker = await screen.findByLabelText('Application');
    expect(picker.querySelectorAll('option')).toHaveLength(2);
    expect(picker.textContent).not.toContain('Application #1');
  });
});
