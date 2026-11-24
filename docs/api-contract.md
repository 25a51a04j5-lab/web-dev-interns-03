# Week 3 API Contract

This document defines the planned API shapes for interviews, offers, notifications,
and activity history. These endpoints are a contract for upcoming implementation;
they are not all available in the backend yet. The Week 2 routes remain documented
in [api-contract-week2.md](./api-contract-week2.md).

## Conventions

- API prefix: `/api`
- Protected routes require `Authorization: Bearer <token>`.
- Dates and times use ISO 8601 timestamps with a timezone offset or `Z`.
- Responses use JSON. IDs are positive integers.
- HR and Admin access is restricted to records belonging to their company.
- Candidates can only read interviews, offers, notifications, and activity related
  to their own account and applications.
- Invalid input returns `400`; missing/invalid authentication returns `401`;
  authenticated but unauthorized requests return `403`; inaccessible records
  return `404`; invalid lifecycle changes return `409`.

## Interviews

### List interviews for an application

`GET /api/applications/:applicationId/interviews`

Access: HR/Admin for applications in their company; the owning Candidate may view
their interviews.

Response: `200`

```json
{
  "interviews": [
    {
      "id": 31,
      "applicationId": 18,
      "scheduledAt": "2026-12-01T10:00:00Z",
      "durationMinutes": 45,
      "meetingUrl": "https://meet.example.test/...",
      "status": "SCHEDULED",
      "notes": null
    }
  ]
}
```

### Schedule an interview

`POST /api/applications/:applicationId/interviews`

Access: HR/Admin for applications in their company.

Request:

```json
{
  "scheduledAt": "2026-12-01T10:00:00Z",
  "durationMinutes": 45,
  "meetingUrl": "https://meet.example.test/...",
  "notes": "Technical interview"
}
```

`durationMinutes` must be a positive integer. The created interview has status
`SCHEDULED`. Response: `201` with `{ "interview": { ... } }`.

### Reschedule an interview

`PATCH /api/interviews/:id`

Access: HR/Admin for the interview's company. Only scheduled interviews may be
rescheduled.

Request: the same scheduling fields as above. The resulting status is
`RESCHEDULED`. Response: `200` with `{ "interview": { ... } }`.

### Cancel an interview

`POST /api/interviews/:id/cancel`

Access: HR/Admin for the interview's company. Only scheduled or rescheduled
interviews may be cancelled.

Request:

```json
{ "reason": "Candidate requested a different time" }
```

Response: `200` with `{ "interview": { "status": "CANCELLED" } }`.

### Submit interview feedback

`POST /api/interviews/:id/feedback`

Access: HR/Admin for the interview's company.

Request:

```json
{
  "rating": 4,
  "comments": "Strong problem-solving skills."
}
```

`rating` is optional and, when provided, is an integer from 1 through 5.
Response: `201` with `{ "feedback": { ... } }`.

## Offers

Offer statuses are `DRAFT`, `ISSUED`, `ACCEPTED`, and `DECLINED`. `ACCEPTED` and
`DECLINED` are terminal. An offer may be issued only once from `DRAFT`; only its
owning Candidate may respond to an issued offer.

### Get an application's offer

`GET /api/applications/:applicationId/offer`

Access: HR/Admin for applications in their company; the owning Candidate may view
the offer after it is issued. Draft offers are hidden from Candidates.

Response: `200` with `{ "offer": { ... } }`. Response fields include the offer ID,
application ID, template name, status, issued/response timestamps, and generated
letter preview when available.

### Draft an offer

`PUT /api/applications/:applicationId/offer`

Access: HR/Admin for applications in their company.

Request:

```json
{
  "templateName": "standard",
  "terms": {
    "position": "Software Engineer",
    "compensation": "As agreed",
    "startDate": "2027-01-15",
    "expiresAt": "2027-01-05"
  }
}
```

Saving a draft does not expose it to the Candidate. Response: `200` with
`{ "offer": { ... }, "preview": "..." }`. Offer terms and generated document
storage must remain server-controlled; clients must not submit a storage key.

### Issue a drafted offer

`POST /api/applications/:applicationId/offer/issue`

Access: HR/Admin for applications in their company.

The server generates and stores the letter, changes the offer to `ISSUED`, records
the issuer and issue time, and queues an offer notification. Response: `200` with
`{ "offer": { ... } }`.

### Accept or decline an offer

`POST /api/offers/:id/respond`

Access: the Candidate who owns the associated application.

Request:

```json
{
  "decision": "ACCEPTED",
  "responseNote": "Thank you. I accept the offer."
}
```

`decision` must be `ACCEPTED` or `DECLINED`. A response is allowed only while the
offer is `ISSUED` and can be submitted once. Response: `200` with
`{ "offer": { ... } }`.

## Notifications

Notification events are created by backend workflows; clients do not create or
edit delivery records directly. Email delivery may be mocked or disabled in a
development environment and must be identified as such.

### List notifications for the signed-in user

`GET /api/notifications?page=1&limit=20`

Access: any authenticated user; results are restricted to that user's recipient
ID. `page` defaults to 1 and `limit` defaults to 20 with a maximum of 100.

Response: `200`

```json
{
  "notifications": [
    {
      "id": 52,
      "eventType": "OFFER_ISSUED",
      "payload": { "applicationId": 18, "offerId": 9 },
      "deliveryStatus": "PENDING",
      "attemptedAt": null,
      "createdAt": "2026-11-24T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

Possible event types include `APPLICATION_RECEIVED`, `INTERVIEW_SCHEDULED`,
`INTERVIEW_RESCHEDULED`, `INTERVIEW_CANCELLED`, and `OFFER_ISSUED`.
`deliveryStatus` is `PENDING`, `SENT`, or `FAILED`.

## Activity history

### List activity for an entity

`GET /api/activity?entityType=APPLICATION&entityId=18&page=1&limit=20`

Access: HR/Admin for entities in their company; Candidates only for their own
application and related entities. The API must apply entity-level authorization
before returning records.

Response: `200`

```json
{
  "activities": [
    {
      "id": 87,
      "actorId": 4,
      "action": "OFFER_ISSUED",
      "entityType": "APPLICATION",
      "entityId": 18,
      "details": { "offerId": 9 },
      "createdAt": "2026-11-24T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

Activity is append-only. Interview schedule/reschedule/cancel, offer draft/issue/
response, and application-stage changes should write activity records through the
shared activity service.

## Error response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": []
  }
}
```

For authorization failures, use `UNAUTHORIZED` (`401`) or `FORBIDDEN` (`403`).
Use `404` for inaccessible records where revealing their existence would expose
another company's or candidate's data.
