
const database = require('../config/database');

function parseJson(value) {
  if (value === null || value === undefined || typeof value !== 'string') return value;
  return JSON.parse(value);
}

function toCandidateProfile(row) {
  if (!row) return null;

  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    phone: row.phone,
    location: row.location,
    headline: row.headline,
    bio: row.bio,
    summary: row.summary,
    skills: parseJson(row.skills),
    education: parseJson(row.education),
    experienceYears: row.experience_years,
    portfolioUrl: row.portfolio_url,
    linkedinUrl: row.linkedin_url,
    githubUrl: row.github_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findByUserId(userId) {
  const { rows } = await database.query(
    `SELECT id, user_id, phone, location, headline, bio, summary, skills, education,
            experience_years, portfolio_url, linkedin_url, github_url, created_at, updated_at
     FROM candidate_profiles
     WHERE user_id = ?`,
    [userId],
  );

  return toCandidateProfile(rows[0]);
}

async function createOrUpdate(userId, profile) {
  const { rows } = await database.query(
    `INSERT INTO candidate_profiles
       (user_id, phone, location, headline, bio, summary, skills, education,
        experience_years, portfolio_url, linkedin_url, github_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       phone = VALUES(phone),
       location = VALUES(location),
       headline = VALUES(headline),
       bio = VALUES(bio),
       summary = VALUES(summary),
       skills = VALUES(skills),
       education = VALUES(education),
       experience_years = VALUES(experience_years),
       portfolio_url = VALUES(portfolio_url),
       linkedin_url = VALUES(linkedin_url),
       github_url = VALUES(github_url),
       updated_at = NOW()`,
    [
      userId,
      profile.phone ?? null,
      profile.location ?? null,
      profile.headline ?? null,
      profile.bio ?? null,
      profile.summary ?? null,
      profile.skills ? JSON.stringify(profile.skills) : null,
      profile.education ? JSON.stringify(profile.education) : null,
      profile.experienceYears ?? null,
      profile.portfolioUrl ?? null,
      profile.linkedinUrl ?? null,
      profile.githubUrl ?? null,
    ],
  );

  return findByUserId(userId);
}

module.exports = {
  findByUserId,
  createOrUpdate,
};
