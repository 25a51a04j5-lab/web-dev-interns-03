const database = require('../config/database');

const jobs = new Map();
let nextId = 1;

function toJob(row) {
  return row && {
    id: Number(row.id),
    companyId: Number(row.company_id),
    createdBy: Number(row.created_by),
    title: row.title,
    description: row.description,
    requirements: row.requirements,
    location: row.location,
    employmentType: row.employment_type,
    status: row.status,
    publishedAt: row.published_at,
    closesAt: row.closes_at,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function create(data) {
  if (database.isDatabaseConfigured()) {
    const { rows } = await database.query(
      `INSERT INTO jobs
        (company_id, created_by, title, description, requirements, location, employment_type, closes_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [data.companyId, data.createdBy, data.title, data.description, data.requirements,
        data.location, data.employmentType, data.closesAt],
    );
    return toJob(rows[0]);
  }
  const now = new Date().toISOString();
  const job = { id: nextId++, ...data, status: 'DRAFT', publishedAt: null, archivedAt: null, createdAt: now, updatedAt: now };
  jobs.set(job.id, job);
  return { ...job };
}

async function list({ includeUnpublished = false } = {}) {
  if (database.isDatabaseConfigured()) {
    const where = includeUnpublished ? '' : "WHERE status = 'PUBLISHED'";
    const { rows } = await database.query(`SELECT * FROM jobs ${where} ORDER BY created_at DESC`);
    return rows.map(toJob);
  }
  return [...jobs.values()]
    .filter((job) => includeUnpublished || job.status === 'PUBLISHED')
    .sort((a, b) => b.id - a.id)
    .map((job) => ({ ...job }));
}

async function findById(id) {
  if (database.isDatabaseConfigured()) {
    const { rows } = await database.query('SELECT * FROM jobs WHERE id = $1', [id]);
    return toJob(rows[0]);
  }
  return jobs.has(Number(id)) ? { ...jobs.get(Number(id)) } : null;
}

async function update(id, data) {
  if (database.isDatabaseConfigured()) {
    const { rows } = await database.query(
      `UPDATE jobs
       SET title = COALESCE($2, title), description = COALESCE($3, description),
           requirements = COALESCE($4, requirements), location = COALESCE($5, location),
           employment_type = COALESCE($6, employment_type), closes_at = COALESCE($7, closes_at),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, data.title, data.description, data.requirements, data.location, data.employmentType, data.closesAt],
    );
    return toJob(rows[0]);
  }
  const job = jobs.get(Number(id));
  if (!job) return null;
  Object.assign(job, data, { updatedAt: new Date().toISOString() });
  return { ...job };
}

async function setStatus(id, status) {
  if (database.isDatabaseConfigured()) {
    const fields = {
      PUBLISHED: 'status = $2, published_at = COALESCE(published_at, NOW())',
      CLOSED: 'status = $2',
      ARCHIVED: 'status = $2, archived_at = NOW()',
    };
    const { rows } = await database.query(
      `UPDATE jobs SET ${fields[status]}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, status],
    );
    return toJob(rows[0]);
  }
  const job = jobs.get(Number(id));
  if (!job) return null;
  job.status = status;
  if (status === 'PUBLISHED' && !job.publishedAt) job.publishedAt = new Date().toISOString();
  if (status === 'ARCHIVED') job.archivedAt = new Date().toISOString();
  job.updatedAt = new Date().toISOString();
  return { ...job };
}

function _reset() {
  if (database.isDatabaseConfigured()) return;
  jobs.clear();
  nextId = 1;
}

module.exports = { create, findById, list, setStatus, update, _reset };
