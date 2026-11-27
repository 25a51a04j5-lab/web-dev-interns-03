import React, { useState } from 'react';
import { api } from '../api/client';

function CandidateOffers() {
  const [applicationId, setApplicationId] = useState('');
  const [offer, setOffer] = useState(null);
  const [preview, setPreview] = useState('');
  const [responseNote, setResponseNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  async function loadOffer(event) {
    event.preventDefault();
    const normalizedId = applicationId.trim();
    if (!/^[1-9]\d*$/.test(normalizedId)) {
      setError('Enter a valid application ID.');
      setOffer(null);
      setPreview('');
      setHasSearched(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage('');
      setOffer(null);
      setPreview('');
      setHasSearched(false);
      const result = await api.get(`/applications/${normalizedId}/offer`);
      setOffer(result.offer || null);
      setPreview(result.preview || result.offer?.preview || '');
      setHasSearched(true);
    } catch (err) {
      setError(err.message || 'Unable to load this offer.');
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  }

  async function respond(decision) {
    if (!offer || offer.status !== 'ISSUED') return;

    const action = decision === 'ACCEPTED' ? 'accept' : 'decline';
    if (!window.confirm(`Are you sure you want to ${action} this offer? This response cannot be changed.`)) {
      return;
    }

    try {
      setResponding(true);
      setError('');
      setMessage('');
      const result = await api.post(`/offers/${offer.id}/respond`, {
        decision,
        responseNote: responseNote.trim() || undefined,
      });
      setOffer(result.offer || { ...offer, status: decision });
      setMessage(decision === 'ACCEPTED'
        ? 'You accepted the offer.'
        : 'You declined the offer.');
    } catch (err) {
      setError(err.message || `Unable to ${action} this offer.`);
    } finally {
      setResponding(false);
    }
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  }

  return (
    <div className="hr-page">
      <div className="hr-page-heading">
        <div>
          <p className="eyebrow">CANDIDATE WORKSPACE / OFFERS</p>
          <h1>My offer</h1>
          <p className="muted">
            Review an offer shared by your recruitment contact and submit your decision.
          </p>
        </div>
      </div>

      {error && <div className="hr-alert error" role="alert">{error}</div>}
      {message && <div className="hr-alert success" role="status">{message}</div>}

      <section className="panel hr-panel candidate-offer-lookup">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">FIND OFFER</p>
            <h2>Application details</h2>
          </div>
        </div>
        <form className="candidate-offer-lookup-form" onSubmit={loadOffer}>
          <label>
            Application ID
            <input
              type="number"
              min="1"
              step="1"
              value={applicationId}
              onChange={(event) => setApplicationId(event.target.value)}
              placeholder="Enter the application ID shared by HR"
              required
            />
          </label>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Loading offer...' : 'View offer'}
          </button>
        </form>
        <p className="muted candidate-offer-help">
          Only an offer belonging to your candidate account can be shown. Ask HR for the
          application ID if you do not have it.
        </p>
      </section>

      {hasSearched && !loading && !error && !offer && (
        <section className="panel hr-panel">
          <p className="empty-state">No issued offer was found for this application.</p>
        </section>
      )}

      {offer && (
        <section className="panel hr-panel candidate-offer-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">OFFER LETTER</p>
              <h2>{offer.terms?.position || offer.position || 'Employment offer'}</h2>
            </div>
            <span className={`job-status status-${offer.status?.toLowerCase() || 'draft'}`}>
              {offer.status || 'UNKNOWN'}
            </span>
          </div>

          <dl className="candidate-offer-details">
            <div>
              <dt>Application</dt>
              <dd>#{offer.applicationId || applicationId}</dd>
            </div>
            <div>
              <dt>Start date</dt>
              <dd>{formatDate(offer.terms?.startDate || offer.startDate)}</dd>
            </div>
            <div>
              <dt>Response deadline</dt>
              <dd>{formatDate(offer.terms?.expiresAt || offer.expiresAt)}</dd>
            </div>
            <div>
              <dt>Issued</dt>
              <dd>{formatDate(offer.issuedAt)}</dd>
            </div>
          </dl>

          {offer.terms?.compensation && (
            <div className="candidate-offer-terms">
              <h3>Compensation</h3>
              <p>{offer.terms.compensation}</p>
            </div>
          )}

          <div className="candidate-offer-letter">
            <h3>Offer letter</h3>
            {preview ? (
              <pre>{preview}</pre>
            ) : offer.documentUrl ? (
              <a href={offer.documentUrl} target="_blank" rel="noreferrer">
                Open offer letter
              </a>
            ) : (
              <p className="muted">The offer letter preview is not available.</p>
            )}
          </div>

          {offer.status === 'ISSUED' ? (
            <div className="candidate-offer-response">
              <label>
                Note to HR (optional)
                <textarea
                  rows="3"
                  maxLength="2000"
                  value={responseNote}
                  onChange={(event) => setResponseNote(event.target.value)}
                  disabled={responding}
                  placeholder="Add a note with your response"
                />
              </label>
              <div className="candidate-offer-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => respond('ACCEPTED')}
                  disabled={responding}
                >
                  {responding ? 'Submitting...' : 'Accept offer'}
                </button>
                <button
                  className="candidate-offer-decline"
                  type="button"
                  onClick={() => respond('DECLINED')}
                  disabled={responding}
                >
                  Decline offer
                </button>
              </div>
            </div>
          ) : (
            <p className="muted candidate-offer-closed">
              {offer.status === 'ACCEPTED'
                ? 'You have accepted this offer.'
                : offer.status === 'DECLINED'
                  ? 'You have declined this offer.'
                  : 'This offer is not open for a response.'}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

export default CandidateOffers;
