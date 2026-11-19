const database = require('../config/database');
const applicationRepository = require('./applicationRepository');

const resumes = new Map();
let nextId = 1;

function toResume(row) {
  return row && {
    id: Number(row.id),
    candidateId: Number(row.candidate_id),
    originalFilename: row.original_filename,
    storageKey: row.storage_key,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    uploadedAt: row.uploaded_at,
  };
}

async function create({ candidateId, originalFilename, storageKey, mimeType, sizeBytes }) {
  if (database.isDatabaseConfigured()) {
    const { insertId } = await database.query(
      `INSERT INTO resumes
        (candidate_id, original_filename, storage_key, mime_type, size_bytes)
       VALUES (?, ?, ?, ?, ?)`,
      [candidateId, originalFilename, storageKey, mimeType, sizeBytes],
    );
    const { rows: created } = await database.query('SELECT * FROM resumes WHERE id = ?', [insertId]);
    return toResume(created[0]);
  }
  const resume = {
    id: nextId++,
    candidateId,
    originalFilename,
    storageKey,
    mimeType,
    sizeBytes,
    uploadedAt: new Date().toISOString(),
  };
  resumes.set(resume.id, resume);
  return { ...resume };
}

async function findLatestByCandidate(candidateId) {
  if (database.isDatabaseConfigured()) {
    const { rows } = await database.query(
      `SELECT * FROM resumes
       WHERE candidate_id = ?
       ORDER BY uploaded_at DESC
       LIMIT 1`,
      [candidateId],
    );
    return toResume(rows[0]);
  }
  return [...resumes.values()]
    .filter((resume) => resume.candidateId === Number(candidateId))
    .sort((a, b) => b.id - a.id)[0] || null;
}

async function findById(id) {
  if (database.isDatabaseConfigured()) {
    const { rows } = await database.query('SELECT * FROM resumes WHERE id = ?', [id]);
    return toResume(rows[0]);
  }
  return resumes.has(Number(id)) ? { ...resumes.get(Number(id)) } : null;
}

async function findByApplication(applicationId) {
  if (database.isDatabaseConfigured()) {
    const { rows } = await database.query(
      `SELECT r.*
       FROM resumes r
       JOIN applications a ON a.candidate_id = r.candidate_id
       WHERE a.id = ?
       ORDER BY r.uploaded_at DESC
       LIMIT 1`,
      [applicationId],
    );
    return toResume(rows[0]);
  }
  const application = await applicationRepository.findById(applicationId);
  if (!application) return null;
  return findLatestByCandidate(application.candidateId);
}

function _reset() {
  if (database.isDatabaseConfigured()) return;
  resumes.clear();
  nextId = 1;
}

module.exports = { create, findByApplication, findById, findLatestByCandidate, _reset };
