-- Smart Recruitment & Applicant Tracking System
-- PostgreSQL initial schema. Apply this migration before connecting the repositories.

CREATE TYPE user_role AS ENUM ('ADMIN', 'HR', 'CANDIDATE');
CREATE TYPE job_status AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');
CREATE TYPE application_stage AS ENUM (
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'SELECTED',
  'OFFERED',
  'REJECTED',
  'WITHDRAWN'
);
CREATE TYPE interview_status AS ENUM ('SCHEDULED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED');
CREATE TYPE offer_status AS ENUM ('DRAFT', 'ISSUED', 'ACCEPTED', 'DECLINED');

CREATE TABLE companies (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  website VARCHAR(255),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT REFERENCES companies(id) ON DELETE SET NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(320) NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'CANDIDATE',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_staff_company_check CHECK (
    role = 'CANDIDATE' OR company_id IS NOT NULL
  )
);

CREATE TABLE candidate_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(40),
  location VARCHAR(160),
  headline VARCHAR(180),
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE jobs (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT NOT NULL,
  location VARCHAR(160),
  employment_type VARCHAR(80),
  status job_status NOT NULL DEFAULT 'DRAFT',
  published_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT jobs_closing_after_publish_check CHECK (
    closes_at IS NULL OR published_at IS NULL OR closes_at >= published_at
  )
);

CREATE TABLE applications (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
  candidate_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  cover_letter TEXT,
  stage application_stage NOT NULL DEFAULT 'APPLIED',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT applications_job_candidate_unique UNIQUE (job_id, candidate_id)
);

CREATE TABLE application_stage_history (
  id BIGSERIAL PRIMARY KEY,
  application_id BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  changed_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  previous_stage application_stage,
  new_stage application_stage NOT NULL,
  note TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT application_stage_change_check CHECK (
    previous_stage IS NULL OR previous_stage <> new_stage
  )
);

CREATE TABLE resumes (
  id BIGSERIAL PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_filename VARCHAR(255) NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes BIGINT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT resumes_size_positive_check CHECK (size_bytes > 0)
);

CREATE TABLE interviews (
  id BIGSERIAL PRIMARY KEY,
  application_id BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  scheduled_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  meeting_url TEXT,
  status interview_status NOT NULL DEFAULT 'SCHEDULED',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interviews_duration_check CHECK (duration_minutes BETWEEN 15 AND 480)
);

CREATE TABLE interview_feedback (
  id BIGSERIAL PRIMARY KEY,
  interview_id BIGINT NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  submitted_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  rating SMALLINT,
  comments TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interview_feedback_rating_check CHECK (rating IS NULL OR rating BETWEEN 1 AND 5)
);

CREATE TABLE offers (
  id BIGSERIAL PRIMARY KEY,
  application_id BIGINT NOT NULL UNIQUE REFERENCES applications(id) ON DELETE RESTRICT,
  issued_by BIGINT REFERENCES users(id) ON DELETE RESTRICT,
  template_name VARCHAR(160),
  document_key TEXT,
  status offer_status NOT NULL DEFAULT 'DRAFT',
  issued_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  response_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT offers_response_date_check CHECK (
    responded_at IS NULL OR issued_at IS NOT NULL
  )
);

CREATE TABLE onboarding_tasks (
  id BIGSERIAL PRIMARY KEY,
  application_id BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  description TEXT,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT onboarding_completion_check CHECK (
    completed_at IS NULL OR completed_by IS NOT NULL
  )
);

CREATE TABLE activity_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id BIGINT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_events (
  id BIGSERIAL PRIMARY KEY,
  recipient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  delivery_status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  attempted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX users_company_role_idx ON users (company_id, role);
CREATE INDEX jobs_company_status_idx ON jobs (company_id, status);
CREATE INDEX jobs_published_at_idx ON jobs (published_at);
CREATE INDEX applications_candidate_idx ON applications (candidate_id);
CREATE INDEX applications_job_stage_idx ON applications (job_id, stage);
CREATE INDEX application_history_application_idx ON application_stage_history (application_id, changed_at);
CREATE INDEX resumes_candidate_idx ON resumes (candidate_id, uploaded_at DESC);
CREATE INDEX interviews_application_status_idx ON interviews (application_id, status);
CREATE INDEX interviews_scheduled_at_idx ON interviews (scheduled_at);
CREATE INDEX onboarding_application_idx ON onboarding_tasks (application_id, due_at);
CREATE INDEX activity_logs_entity_idx ON activity_logs (entity_type, entity_id, created_at);
CREATE INDEX activity_logs_actor_idx ON activity_logs (actor_id, created_at);
CREATE INDEX notification_recipient_status_idx ON notification_events (recipient_id, delivery_status);
