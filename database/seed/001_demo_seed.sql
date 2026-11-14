-- Smart Recruitment & Applicant Tracking System
-- Synthetic development data only. Do not use in production.

BEGIN;

INSERT INTO companies (id, name, website, description)
VALUES (
  1,
  'Northstar Labs',
  'https://northstar.example.test',
  'Synthetic software company used for local ATS demonstrations.'
);

INSERT INTO users (id, company_id, name, email, password_hash, role)
VALUES
  (
    1,
    1,
    'Avery Admin',
    'admin@northstar.example.test',
    '$2a$10$ufUTKdSxi.LCd0dyXB9souVKlMFq/wSpD033EbYTtenJVC8KEvsM6',
    'ADMIN'
  ),
  (
    2,
    1,
    'Morgan HR',
    'hr@northstar.example.test',
    '$2a$10$ufUTKdSxi.LCd0dyXB9souVKlMFq/wSpD033EbYTtenJVC8KEvsM6',
    'HR'
  ),
  (
    3,
    NULL,
    'Casey Candidate',
    'casey@candidate.example.test',
    '$2a$10$ufUTKdSxi.LCd0dyXB9souVKlMFq/wSpD033EbYTtenJVC8KEvsM6',
    'CANDIDATE'
  ),
  (
    4,
    NULL,
    'Jordan Candidate',
    'jordan@candidate.example.test',
    '$2a$10$ufUTKdSxi.LCd0dyXB9souVKlMFq/wSpD033EbYTtenJVC8KEvsM6',
    'CANDIDATE'
  );

INSERT INTO candidate_profiles (user_id, phone, location, headline, bio)
VALUES
  (
    3,
    '+1-555-0101',
    'Remote',
    'Full-stack JavaScript developer',
    'Synthetic candidate profile for application workflow demonstrations.'
  ),
  (
    4,
    '+1-555-0102',
    'Toronto',
    'Frontend developer',
    'Synthetic candidate profile for access-control demonstrations.'
  );

INSERT INTO jobs (
  id,
  company_id,
  created_by,
  title,
  description,
  requirements,
  location,
  employment_type,
  status,
  published_at,
  closes_at
)
VALUES
  (
    1,
    1,
    2,
    'Junior Full-Stack Engineer',
    'Build accessible recruitment workflows with the product engineering team.',
    'JavaScript, REST APIs, SQL fundamentals, and collaborative problem solving.',
    'Remote',
    'Full-time',
    'PUBLISHED',
    '2026-11-09T09:00:00Z',
    '2026-12-15T23:59:59Z'
  ),
  (
    2,
    1,
    2,
    'Product Designer',
    'Design clear candidate and recruiter experiences for a growing HR platform.',
    'User research, interaction design, prototyping, and design systems.',
    'Hybrid - Toronto',
    'Full-time',
    'DRAFT',
    NULL,
    NULL
  );

INSERT INTO applications (
  id,
  job_id,
  candidate_id,
  cover_letter,
  stage,
  applied_at,
  updated_at
)
VALUES
  (
    1,
    1,
    3,
    'I enjoy building reliable products and would like to contribute to Northstar Labs.',
    'INTERVIEW',
    '2026-11-10T14:30:00Z',
    '2026-11-12T10:00:00Z'
  ),
  (
    2,
    1,
    4,
    'I am interested in creating simple, accessible interfaces for candidates and recruiters.',
    'SCREENING',
    '2026-11-11T16:00:00Z',
    '2026-11-11T16:00:00Z'
  );

INSERT INTO application_stage_history (
  application_id,
  changed_by,
  previous_stage,
  new_stage,
  note,
  changed_at
)
VALUES
  (1, 3, NULL, 'APPLIED', 'Application submitted.', '2026-11-10T14:30:00Z'),
  (1, 2, 'APPLIED', 'SCREENING', 'Initial resume review started.', '2026-11-11T09:15:00Z'),
  (1, 2, 'SCREENING', 'INTERVIEW', 'Candidate invited to technical interview.', '2026-11-12T10:00:00Z'),
  (2, 4, NULL, 'APPLIED', 'Application submitted.', '2026-11-11T16:00:00Z'),
  (2, 2, 'APPLIED', 'SCREENING', 'Application queued for review.', '2026-11-11T16:00:00Z');

INSERT INTO resumes (
  id,
  candidate_id,
  original_filename,
  storage_key,
  mime_type,
  size_bytes,
  uploaded_at
)
VALUES
  (
    1,
    3,
    'casey-candidate-resume.pdf',
    'demo/resumes/candidate-3-resume.pdf',
    'application/pdf',
    148320,
    '2026-11-10T14:25:00Z'
  ),
  (
    2,
    4,
    'jordan-candidate-resume.pdf',
    'demo/resumes/candidate-4-resume.pdf',
    'application/pdf',
    132880,
    '2026-11-11T15:55:00Z'
  );

INSERT INTO interviews (
  id,
  application_id,
  scheduled_by,
  scheduled_at,
  duration_minutes,
  meeting_url,
  status,
  notes
)
VALUES (
  1,
  1,
  2,
  '2026-11-18T15:00:00Z',
  60,
  'https://meet.example.test/northstar-demo',
  'SCHEDULED',
  'Synthetic technical interview.'
);

INSERT INTO interview_feedback (
  interview_id,
  submitted_by,
  rating,
  comments,
  created_at
)
VALUES (
  1,
  2,
  NULL,
  'Feedback will be recorded after the interview.',
  '2026-11-12T10:05:00Z'
);

INSERT INTO offers (
  id,
  application_id,
  issued_by,
  template_name,
  document_key,
  status
)
VALUES (
  1,
  1,
  2,
  'standard-engineering-offer-v1',
  'demo/offers/application-1-offer.pdf',
  'DRAFT'
);

INSERT INTO onboarding_tasks (
  id,
  application_id,
  title,
  description,
  due_at,
  created_by
)
VALUES
  (
    1,
    1,
    'Provide proof of work authorization',
    'Upload the required synthetic onboarding document.',
    '2026-12-01T17:00:00Z',
    2
  ),
  (
    2,
    1,
    'Complete welcome survey',
    'Complete the new-hire preferences survey.',
    '2026-12-03T17:00:00Z',
    2
  );

INSERT INTO activity_logs (
  actor_id,
  action,
  entity_type,
  entity_id,
  metadata,
  created_at
)
VALUES
  (
    2,
    'APPLICATION_STAGE_CHANGED',
    'application',
    1,
    '{"from":"SCREENING","to":"INTERVIEW"}',
    '2026-11-12T10:00:00Z'
  ),
  (
    2,
    'INTERVIEW_SCHEDULED',
    'interview',
    1,
    '{"applicationId":1}',
    '2026-11-12T10:01:00Z'
  );

INSERT INTO notification_events (
  recipient_id,
  event_type,
  payload,
  delivery_status,
  created_at
)
VALUES
  (
    3,
    'INTERVIEW_SCHEDULED',
    '{"interviewId":1,"applicationId":1}',
    'PENDING',
    '2026-11-12T10:01:00Z'
  ),
  (
    2,
    'APPLICATION_SUBMITTED',
    '{"applicationId":2,"candidateId":4}',
    'SIMULATED_DELIVERED',
    '2026-11-11T16:00:01Z'
  );

SELECT setval(
  pg_get_serial_sequence('companies', 'id'),
  (SELECT MAX(id) FROM companies)
);
SELECT setval(
  pg_get_serial_sequence('users', 'id'),
  (SELECT MAX(id) FROM users)
);
SELECT setval(
  pg_get_serial_sequence('jobs', 'id'),
  (SELECT MAX(id) FROM jobs)
);
SELECT setval(
  pg_get_serial_sequence('applications', 'id'),
  (SELECT MAX(id) FROM applications)
);
SELECT setval(
  pg_get_serial_sequence('resumes', 'id'),
  (SELECT MAX(id) FROM resumes)
);
SELECT setval(
  pg_get_serial_sequence('interviews', 'id'),
  (SELECT MAX(id) FROM interviews)
);
SELECT setval(
  pg_get_serial_sequence('offers', 'id'),
  (SELECT MAX(id) FROM offers)
);
SELECT setval(
  pg_get_serial_sequence('onboarding_tasks', 'id'),
  (SELECT MAX(id) FROM onboarding_tasks)
);

COMMIT;
