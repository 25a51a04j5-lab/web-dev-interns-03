import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';

const emptyTerms = {
  position: '',
  compensation: '',
  startDate: '',
  expiresAt: '',
};

function getTerms(offer) {
  return {
    position: offer?.terms?.position || '',
    compensation: offer?.terms?.compensation || '',
    startDate: offer?.terms?.startDate || '',
    expiresAt: offer?.terms?.expiresAt || '',
  };
}

function HROffers() {
  const [applications, setApplications] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [offer, setOffer] = useState(null);
  const [loadedOfferFor, setLoadedOfferFor] = useState('');
  const [terms, setTerms] = useState(emptyTerms);
  const [templateName, setTemplateName] = useState('standard');
  const [preview, setPreview] = useState('');
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [loadingOffer, setLoadingOffer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const eligibleApplications = useMemo(
    () => applications.filter((application) => ['SELECTED', 'OFFERED'].includes(application.stage)),
    [applications],
  );
  const selectedApplication = eligibleApplications.find(
    (application) => String(application.id) === String(selectedId),
  );
  const isEditable = !offer || offer.status === 'DRAFT';

  useEffect(() => {
    let active = true;

    async function loadApplications() {
      try {
        setLoadingApplications(true);
        setError('');
        const result = await api.get('/applications');
        if (!active) return;

        const eligible = (result.applications || []).filter(
          (application) => ['SELECTED', 'OFFERED'].includes(application.stage),
        );
        setApplications(eligible);
        setSelectedId((current) => (
          eligible.some((application) => String(application.id) === String(current))
            ? current
            : String(eligible[0]?.id || '')
        ));
      } catch (err) {
        if (active) setError(err.message || 'Unable to load eligible applications.');
      } finally {
        if (active) setLoadingApplications(false);
      }
    }

    loadApplications();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadOffer() {
      if (!selectedId) {
        setOffer(null);
        setTerms(emptyTerms);
        setTemplateName('standard');
        setPreview('');
        setLoadedOfferFor('');
        return;
      }

      try {
        setLoadingOffer(true);
        setError('');
        setMessage('');
        const result = await api.get(`/applications/${selectedId}/offer`);
        if (!active) return;

        const loadedOffer = result.offer || null;
        setOffer(loadedOffer);
        setTerms(getTerms(loadedOffer));
        setTemplateName(loadedOffer?.templateName || 'standard');
        setPreview(result.preview || loadedOffer?.preview || '');
      } catch (err) {
        if (!active) return;
        if (err.status === 404) {
          setOffer(null);
          setTerms(emptyTerms);
          setTemplateName('standard');
          setPreview('');
        } else {
          setError(err.message || 'Unable to load offer details.');
        }
      } finally {
        if (active) {
          setLoadingOffer(false);
          setLoadedOfferFor(String(selectedId));
        }
      }
    }

    loadOffer();
    return () => {
      active = false;
    };
  }, [selectedId]);

  function updateTerm(event) {
    const { name, value } = event.target;
    setTerms((current) => ({ ...current, [name]: value }));
  }

  async function saveDraft(event) {
    event.preventDefault();
    if (!selectedId) return;

    try {
      setSaving(true);
      setError('');
      setMessage('');
      const result = await api.put(`/applications/${selectedId}/offer`, {
        templateName,
        terms: {
          ...terms,
          expiresAt: terms.expiresAt || null,
        },
      });
      setOffer(result.offer || null);
      setPreview(result.preview || result.offer?.preview || '');
      setMessage('Offer draft saved. Review the generated preview before issuing it.');
    } catch (err) {
      setError(err.message || 'Unable to save the offer draft.');
    } finally {
      setSaving(false);
    }
  }

  async function issueOffer() {
    if (!selectedId || offer?.status !== 'DRAFT') return;
    if (!window.confirm('Issue this offer to the candidate? The issued offer cannot be edited.')) {
      return;
    }

    try {
      setIssuing(true);
      setError('');
      setMessage('');
      const result = await api.post(`/applications/${selectedId}/offer/issue`, {});
      setOffer(result.offer || null);
      setPreview(result.preview || result.offer?.preview || preview);
      setMessage('Offer issued successfully.');
    } catch (err) {
      setError(err.message || 'Unable to issue the offer.');
    } finally {
      setIssuing(false);
    }
  }

  function formatDate(value) {
    if (!value) return 'Not issued';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  return (
    <div className="hr-page">
      <div className="hr-page-heading">
        <div>
          <p className="eyebrow">RECRUITMENT / OFFERS</p>
          <h1>Offers &amp; onboarding</h1>
          <p className="muted">
            Prepare a candidate offer, review its generated letter, and issue it.
          </p>
        </div>
      </div>

      {error && <div className="hr-alert error" role="alert">{error}</div>}
      {message && <div className="hr-alert success" role="status">{message}</div>}

      <section className="panel hr-panel offer-workspace">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">OFFER WORKFLOW</p>
            <h2>Selected candidates</h2>
          </div>
          <label className="offer-application-picker">
            Application
            <select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              disabled={loadingApplications || eligibleApplications.length === 0}
            >
              {eligibleApplications.length === 0 ? (
                <option value="">No selected candidates</option>
              ) : (
                eligibleApplications.map((application) => (
                  <option key={application.id} value={application.id}>
                    Application #{application.id} · Job #{application.jobId} · {application.stage}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>

        {loadingApplications ? (
          <p className="muted" role="status">Loading selected candidates...</p>
        ) : eligibleApplications.length === 0 ? (
          <div className="empty-state">
            No selected candidates are ready for an offer yet. Move an application to
            Selected in the pipeline to begin.
          </div>
        ) : loadingOffer || loadedOfferFor !== String(selectedId) ? (
          <p className="muted" role="status">Loading offer details...</p>
        ) : (
          <div className="offer-layout">
            <div className="offer-form-column">
              <div className="offer-status-row">
                <span className="muted">Current offer status</span>
                <span className={`job-status status-${(offer?.status || 'DRAFT').toLowerCase()}`}>
                  {offer?.status || 'NOT DRAFTED'}
                </span>
              </div>

              <form className="offer-form" onSubmit={saveDraft}>
                <label>
                  Letter template
                  <select
                    value={templateName}
                    onChange={(event) => setTemplateName(event.target.value)}
                    disabled={!isEditable || saving || issuing}
                  >
                    <option value="standard">Standard offer</option>
                  </select>
                </label>

                <label>
                  Position title
                  <input
                    name="position"
                    value={terms.position}
                    onChange={updateTerm}
                    required
                    maxLength={180}
                    disabled={!isEditable || saving || issuing}
                    placeholder="e.g. Software Engineer"
                  />
                </label>

                <label>
                  Compensation details
                  <textarea
                    name="compensation"
                    value={terms.compensation}
                    onChange={updateTerm}
                    required
                    maxLength={2000}
                    rows={3}
                    disabled={!isEditable || saving || issuing}
                    placeholder="Enter the compensation terms"
                  />
                </label>

                <div className="offer-form-grid">
                  <label>
                    Expected start date
                    <input
                      name="startDate"
                      type="date"
                      value={terms.startDate}
                      onChange={updateTerm}
                      required
                      disabled={!isEditable || saving || issuing}
                    />
                  </label>
                  <label>
                    Candidate response deadline
                    <input
                      name="expiresAt"
                      type="date"
                      value={terms.expiresAt}
                      onChange={updateTerm}
                      disabled={!isEditable || saving || issuing}
                    />
                  </label>
                </div>

                {isEditable && (
                  <div className="offer-actions">
                    <button className="primary-button" type="submit" disabled={saving || issuing}>
                      {saving ? 'Saving draft...' : 'Save draft & generate preview'}
                    </button>
                    {offer?.status === 'DRAFT' && (
                      <button
                        className="small-action"
                        type="button"
                        onClick={issueOffer}
                        disabled={saving || issuing}
                      >
                        {issuing ? 'Issuing offer...' : 'Issue offer'}
                      </button>
                    )}
                  </div>
                )}
              </form>

              {offer?.issuedAt && (
                <p className="muted offer-issued-at">
                  Issued {formatDate(offer.issuedAt)}
                </p>
              )}
            </div>

            <aside className="offer-preview" aria-label="Generated offer preview">
              <p className="eyebrow">LETTER PREVIEW</p>
              <h3>{preview ? 'Generated offer letter' : 'Preview not generated yet'}</h3>
              {preview ? (
                <pre>{preview}</pre>
              ) : (
                <p className="muted">
                  Save the draft to generate and review the offer letter before issuing.
                </p>
              )}
            </aside>
          </div>
        )}
      </section>

      <section className="panel hr-panel onboarding-notice">
        <p className="eyebrow">NEXT STEP</p>
        <h2>Onboarding tasks</h2>
        <p className="muted">
          Candidate onboarding task management will be available after an offer is accepted.
        </p>
      </section>
    </div>
  );
}

export default HROffers;
