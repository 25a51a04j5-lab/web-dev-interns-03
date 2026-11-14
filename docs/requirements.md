# Smart Recruitment & Applicant Tracking System (ATS)

## 1. Product scope

The ATS centralizes the hiring lifecycle for a company:

1. An administrator configures the company and manages staff access.
2. HR staff create and publish job openings.
3. Candidates discover published jobs and submit applications.
4. HR and administrators move applications through a controlled hiring pipeline.
5. Authorized staff schedule interviews, record feedback, and issue offers.
6. Candidates view their own application, interview, offer, and onboarding information.
7. Administrators and HR staff use hiring analytics to monitor progress.

The server is the source of truth for authentication, authorization, validation, ownership,
workflow transitions, and audit history. The frontend must never be treated as a security
boundary.

## 2. Roles

### Administrator

An administrator manages company settings, staff accounts, system activity, and all
recruitment workflows. Administrators can create HR and administrator accounts, deactivate
accounts, and access system-wide analytics.

### HR staff

HR staff manage jobs and the recruitment pipeline. They can review applications, manage
interviews, provide feedback, issue offers, and manage onboarding. HR staff cannot manage
administrator accounts or system activity logs.

### Candidate

Candidates can register publicly, maintain their own profile, view published jobs, submit
applications, upload and download their own resume, and view or respond to their own
recruitment records. Candidates must never access another candidate's personal data,
application, resume, interview, or offer.

## 3. Core user journeys

### 3.1 Administrator journey

1. Log in securely.
2. Configure or review company settings.
3. Create HR or administrator staff accounts.
4. Review active and inactive users.
5. Deactivate or update staff access when required.
6. Monitor hiring analytics and system activity.
7. Manage any job, application, interview, offer, or onboarding record when escalation is
   required.

### 3.2 HR journey

1. Log in securely.
2. Create a job draft with title, description, requirements, location, and closing details.
3. Edit the draft and publish it when ready.
4. Review submitted applications and candidate profiles.
5. Move candidates through the permitted pipeline stages:
   `Applied -> Screening -> Interview -> Selected -> Offered`.
6. Review stage-change history.
7. Schedule, reschedule, or cancel interviews and record feedback.
8. Generate and issue an offer from an approved template.
9. Manage onboarding tasks for selected candidates.
10. Review hiring analytics.

### 3.3 Candidate journey

1. Register an account; public registration always creates a `CANDIDATE` account.
2. Log in and complete the candidate profile.
3. Browse published job openings.
4. Open a job detail page and submit a validated application.
5. Upload a resume that satisfies file type and size rules.
6. View the candidate's own application status and stage history.
7. View scheduled interviews and respond to an offer.
8. Track onboarding tasks assigned to the candidate.

### 3.4 End-to-end hiring journey

```text
HR creates draft job
        |
        v
HR publishes job
        |
        v
Candidate views job and submits application
        |
        v
HR reviews application and moves it through the pipeline
        |
        +--> HR schedules interview and records feedback
        |
        v
Candidate is selected and receives an offer
        |
        v
Candidate accepts or declines
        |
        v
HR manages onboarding tasks
```

Every transition must be validated on the server and recorded with the actor, previous
stage, new stage, and timestamp.

## 4. Functional requirements

### Authentication and access

- Users can register and log in.
- Passwords are hashed and never returned by an API.
- JWT authentication expires according to the configured environment value.
- Every protected route authenticates before checking permissions.
- Role and active-account state are rechecked against the user record.
- Public registration cannot create HR or administrator accounts.
- Unauthorized requests return consistent `401` or `403` responses.

### Company and jobs

- Administrators can configure company settings.
- HR and administrators can create, edit, publish, close, and archive jobs.
- Public users can view published jobs.
- Draft, closed, and archived jobs are restricted to HR and administrators.
- A job has a clear status and timestamps for creation, publication, closing, and archiving.

### Applications and pipeline

- Candidates can submit an application for a published job.
- Applications reference exactly one candidate and one job.
- Candidates can view only their own applications.
- HR and administrators can list and search applications.
- Pipeline transitions are controlled and auditable.
- The initial pipeline is:
  `Applied`, `Screening`, `Interview`, `Selected`, `Offered`.

### Resumes and personal data

- Candidates can upload and download only their own resume.
- HR and administrators can download resumes needed for recruitment.
- Upload type and size are validated.
- Resume files are stored privately; the database stores metadata and a controlled file
  reference.
- Uploaded files, credentials, and real candidate data must not be committed to Git.

### Interviews, offers, and onboarding

- HR and administrators can schedule, reschedule, and cancel interviews.
- HR and administrators can submit interview feedback.
- Candidates can view only their own interviews.
- HR and administrators can issue offers from approved templates.
- Candidates can view and accept or decline only their own offer.
- HR and administrators can manage onboarding checklists.

### Analytics and auditability

- HR and administrators can view hiring analytics.
- Analytics should cover job openings, application counts, stage conversion, time-to-hire
  when dates exist, interviews, and offer acceptance when captured.
- Administrators can view system activity logs.
- Stage changes and sensitive access events must be traceable to an actor and timestamp.

## 5. Non-functional requirements

- Validate all client input on the server.
- Keep authorization in the API and data layer, not only in the UI.
- Return consistent JSON errors with actionable validation details.
- Use environment variables for secrets and connection strings.
- Use synthetic demonstration data only.
- Define timestamps and timezone handling consistently.
- Test successful and denied actions for all three roles.
- Keep the main branch runnable with documented setup instructions.
- Document mocked or simulated integrations rather than presenting them as production services.

## 6. Four-week delivery scope

### Week 1: Requirements, architecture, and core data model

- Requirements and user journeys
- Wireframes
- Route map and API contract
- Entity relationship and permission design
- Initial migrations and synthetic seed data
- Reproducible environment and test setup
- Authentication foundations

### Week 2: Jobs, applications, and pipeline

- Job listing and detail views
- Job management forms
- Candidate profile and application submission
- Resume upload validation
- Server-side pipeline validation

### Week 3: Interviews, offers, onboarding, and notifications

- Interview scheduling and feedback
- Offer generation and candidate response
- Onboarding checklist
- Activity history and notification events

### Week 4: Analytics, quality assurance, and delivery

- Hiring analytics dashboard
- Unit, integration, and browser-based tests
- Security and access-control review
- Deployment configuration
- Final documentation and presentation

## 7. Out of scope for the initial prototype

The first prototype will not claim to provide the following unless explicitly implemented and
documented:

- Production email delivery
- Real-time messaging
- Automated resume parsing or ranking
- External identity providers
- Payroll or employee management
- Production-grade multi-region file storage
- Unverified third-party integrations

