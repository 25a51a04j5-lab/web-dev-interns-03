const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const AppError = require('../utils/AppError');
const storage = require('../config/storage');
const resumeRepository = require('../repositories/resumeRepository');
const applicationRepository = require('../repositories/applicationRepository');

async function ensureStorage() {
  await fs.mkdir(storage.resumeDirectory, { recursive: true });
}

function validateFile(file) {
  if (!file) {
    throw AppError.badRequest('Resume file is required', [
      { field: 'resume', message: 'Upload a PDF resume' },
    ]);
  }
  if (!storage.allowedResumeTypes.has(file.mimetype)) {
    throw AppError.badRequest('Unsupported resume type', [
      { field: 'resume', message: 'Only PDF resumes are accepted' },
    ]);
  }
  if (file.size <= 0 || file.size > storage.maxResumeBytes) {
    throw AppError.badRequest('Invalid resume size', [
      { field: 'resume', message: 'Resume must be between 1 byte and 5 MB' },
    ]);
  }
}

async function upload(file, candidateId) {
  validateFile(file);
  await ensureStorage();
  const storageKey = `resumes/${crypto.randomUUID()}.pdf`;
  const absolutePath = path.join(storage.resumeDirectory, path.basename(storageKey));
  await fs.writeFile(absolutePath, file.buffer, { flag: 'wx' });
  try {
    return await resumeRepository.create({
      candidateId,
      originalFilename: path.basename(file.originalname),
      storageKey,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });
  } catch (error) {
    await fs.rm(absolutePath, { force: true });
    throw error;
  }
}

async function getOwn(candidateId) {
  const resume = await resumeRepository.findLatestByCandidate(candidateId);
  if (!resume) throw AppError.notFound('Resume not found');
  return resume;
}

async function getForApplication(applicationId) {
  const application = await applicationRepository.findById(applicationId);
  if (!application) throw AppError.notFound('Application not found');
  const resume = await resumeRepository.findByApplication(applicationId);
  if (!resume) throw AppError.notFound('Resume not found');
  return resume;
}

async function readFile(resume) {
  const filename = path.basename(resume.storageKey);
  return fs.readFile(path.join(storage.resumeDirectory, filename));
}

module.exports = { getForApplication, getOwn, readFile, upload };
