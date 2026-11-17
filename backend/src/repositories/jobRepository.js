const database = require('../config/database');

const jobs = new Map();
let nextId = 1;

const STATUS_COLUMNS = {
  PUBLISHED: 'status = $2, published_at = COALESCE(published_at, NOW())',
  CLOSED: 'status = $2',
  ARCHIVED: 'status = $2, archived_at = NOW()',
};

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
    publishedAt: row.published_at?.toISOString?.() || row.published_at,
    closesAt: row.closes_at?.toISOString?.() || row.closes_at,
    archivedAt: row.archived_at?.toISOString?.() || row.archived_at,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
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

async function list({ includeUnpublished = false, companyId } = {}) {
  if (database.isDatabaseConfigured()) {
    const conditions = [];
    const values = [];
    if (!includeUnpublished) conditions.push(`status = 'PUBLISHED'`);
    if (companyId !== undefined && companyId !== null) {
      values.push(companyId);
      conditions.push(`company_id = $${values.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await database.query(
      `SELECT * FROM jobs ${where} ORDER BY created_at DESC`,
      values,
    );
    return rows.map(toJob);
  }
  return [...jobs.values()]
    .filter((job) => (
      (includeUnpublished || job.status === 'PUBLISHED')
      && (companyId === undefined || companyId === null || job.companyId === companyId)
    ))
    .sort((a, b) => b.id - a.id)
    .map((job) => ({ ...job }));
}

async function findById(id, { companyId } = {}) {
  if (database.isDatabaseConfigured()) {
    const values = [id];
    const companyClause = companyId === undefined || companyId === null
      ? ''
      : ' AND company_id = $2';
    if (companyClause) values.push(companyId);
    const { rows } = await database.query(
      `SELECT * FROM jobs WHERE id = $1${companyClause}`,
      values,
    );
    return toJob(rows[0]);
  }
  const job = jobs.get(Number(id));
  if (!job || (companyId !== undefined && companyId !== null && job.companyId !== companyId)) {
    return null;
  }
  return { ...job };
}

async function update(id, data) {
  if (database.isDatabaseConfigured()) {
    const fields = {
      title: 'title',
      description: 'description',
      requirements: 'requirements',
      location: 'location',
      employmentType: 'employment_type',
      closesAt: 'closes_at',
    };
    const entries = Object.entries(data).filter(([key]) => fields[key]);
    if (!entries.length) return findById(id);
    const values = [id];
    const assignments = entries.map(([key, value], index) => {
      values.push(value);
      return `${fields[key]} = $${index + 2}`;
    });
    const { rows } = await database.query(
      `UPDATE jobs
       SET ${assignments.join(', ')},
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      values,
    );
    return toJob(rows[0]);
  }
  const job = jobs.get(Number(id));
  if (!job) return null;
  Object.assign(job, data, { updatedAt: new Date().toISOString() });
  return { ...job };
}

async function setStatus(id, status) {
  if (!STATUS_COLUMNS[status]) throw new Error(`Unsupported job status "${status}"`);
  if (database.isDatabaseConfigured()) {
    const { rows } = await database.query(
      `UPDATE jobs SET ${STATUS_COLUMNS[status]}, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
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
