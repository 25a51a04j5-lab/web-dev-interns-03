import React from 'react';

function formatTimestamp(value) {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function ActivityTimeline({
  items = [],
  loading = false,
  error = '',
  emptyMessage = 'No activity has been recorded yet.',
}) {
  if (loading) {
    return <p className="muted" role="status">Loading activity...</p>;
  }

  if (error) {
    return <p className="hr-alert error" role="alert">{error}</p>;
  }

  if (items.length === 0) {
    return <p className="muted">{emptyMessage}</p>;
  }

  return (
    <ol className="activity-timeline" aria-label="Activity timeline">
      {items.map((item) => (
        <li className="activity-timeline-item" key={item.id}>
          <span className="activity-timeline-marker" aria-hidden="true" />
          <div className="activity-timeline-content">
            <strong>{item.title}</strong>
            {item.description && <p>{item.description}</p>}
            <small>
              {item.actorLabel ? `${item.actorLabel} · ` : ''}
              <time dateTime={item.occurredAt || undefined}>
                {formatTimestamp(item.occurredAt)}
              </time>
            </small>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default ActivityTimeline;
