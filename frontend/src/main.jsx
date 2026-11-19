import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const roleContent = {
  ADMIN: {
    label: 'Administrator',
    greeting: 'Good morning, Avery',
    summary: 'Company-wide hiring and access overview.',
    metrics: [
      ['Open roles', '12', '+3 this month'],
      ['Active candidates', '86', '+14 this week'],
      ['Offers accepted', '18', '82% acceptance'],
      ['Time to hire', '24d', '-4 days'],
    ],
    focus: 'System activity',
    actions: ['Configure company', 'Manage users', 'View activity log'],
  },
  HR: {
    label: 'HR staff',
    greeting: 'Good morning, Morgan',
    summary: 'Your recruitment pipeline at a glance.',
    metrics: [
      ['Open roles', '8', '+2 this month'],
      ['Applications', '143', '+21 this week'],
      ['Interviews', '16', '5 scheduled today'],
      ['Offers pending', '4', '2 need follow-up'],
    ],
    focus: 'Pipeline attention',
    actions: ['Create a job', 'Review applications', 'Schedule interview'],
  },
  CANDIDATE: {
    label: 'Candidate',
    greeting: 'Welcome back, Casey',
    summary: 'Track your applications and next steps.',
    metrics: [
      ['Applications', '3', '1 updated today'],
      ['In screening', '1', 'Awaiting review'],
      ['Interviews', '1', 'Next: Nov 18'],
      ['Offers', '0', 'No active offers'],
    ],
    focus: 'Your next step',
    actions: ['Browse jobs', 'Update profile', 'Upload resume'],
  },
};

function App() {
  const [role, setRole] = useState('HR');
  const content = roleContent[role];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">N</span>
          <span>Northstar <small>ATS</small></span>
        </div>
        <nav aria-label="Main navigation">
          <a className="nav-item active" href="#overview">Overview</a>
          <a className="nav-item" href="#jobs">Jobs</a>
          <a className="nav-item" href="#applications">Applications</a>
          <a className="nav-item" href="#interviews">Interviews</a>
          <a className="nav-item" href="#offers">Offers</a>
          <a className="nav-item" href="#analytics">Analytics</a>
        </nav>
        <div className="sidebar-bottom">
          <a className="nav-item" href="#settings">Settings</a>
          <div className="account">
            <span className="avatar">MC</span>
            <span><strong>My account</strong><small>morgan@northstar.test</small></span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <span className="breadcrumb">Workspace / Overview</span>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Notifications">⌕</button>
            <button className="avatar avatar-large" aria-label="Open account menu">MC</button>
          </div>
        </header>

        <section className="content">
          <div className="welcome-row">
            <div>
              <p className="eyebrow">OVERVIEW</p>
              <h1>{content.greeting}</h1>
              <p className="muted">{content.summary}</p>
            </div>
            <label className="role-picker">
              Preview role
              <select value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="ADMIN">Administrator</option>
                <option value="HR">HR staff</option>
                <option value="CANDIDATE">Candidate</option>
              </select>
            </label>
          </div>

          <div className="metrics-grid">
            {content.metrics.map(([label, value, change]) => (
              <article className="metric-card" key={label}>
                <span className="muted">{label}</span>
                <strong>{value}</strong>
                <span className="positive">{change}</span>
              </article>
            ))}
          </div>

          <div className="dashboard-grid">
            <section className="panel pipeline-panel">
              <div className="panel-heading">
                <div><p className="eyebrow">HIRING FLOW</p><h2>Application pipeline</h2></div>
                <a href="#applications">View details →</a>
              </div>
              <div className="pipeline">
                {['Applied', 'Screening', 'Interview', 'Selected', 'Offered'].map((stage, index) => (
                  <div className="stage" key={stage}>
                    <span className={`stage-icon stage-${index}`}>{index + 1}</span>
                    <strong>{[42, 27, 16, 8, 4][index]}</strong>
                    <span className="muted">{stage}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel actions-panel">
              <div className="panel-heading"><div><p className="eyebrow">QUICK ACTIONS</p><h2>What do you need?</h2></div></div>
              <div className="action-list">
                {content.actions.map((action) => <a href={`#${action.toLowerCase().replaceAll(' ', '-')}`} key={action}>{action}<span>→</span></a>)}
              </div>
            </section>
          </div>

          <section className="panel activity-panel">
            <div className="panel-heading">
              <div><p className="eyebrow">{content.focus.toUpperCase()}</p><h2>Recent activity</h2></div>
              <a href="#activity">See all →</a>
            </div>
            <div className="activity-row"><span className="activity-dot blue" /><div><strong>Casey Candidate moved to interview</strong><p className="muted">Junior Full-Stack Engineer · 2 hours ago</p></div><span className="tag">Interview</span></div>
            <div className="activity-row"><span className="activity-dot green" /><div><strong>New application received</strong><p className="muted">Product Designer · Yesterday</p></div><span className="tag">New</span></div>
          </section>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
