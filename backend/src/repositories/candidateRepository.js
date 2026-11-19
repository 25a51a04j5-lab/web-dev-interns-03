
const database = require('../config/database');

function toCandidateProfile(row) {
  if (!row) return null;

  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    phone: row.phone,
    location: row.location,
    headline: row.headline,
    bio: row.bio,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findByUserId(userId) {
  const { rows } = await database.query(
    `SELECT id, user_id, phone, location, headline, bio, created_at, updated_at
     FROM candidate_profiles
     WHERE user_id = $1`,
    [userId],
  );

  return toCandidateProfile(rows[0]);
}

async function createOrUpdate(userId, profile) {
  const { rows } = await database.query(
    `INSERT INTO candidate_profiles
       (user_id, phone, location, headline, bio)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id)
     DO UPDATE SET
       phone = EXCLUDED.phone,
       location = EXCLUDED.location,
       headline = EXCLUDED.headline,
       bio = EXCLUDED.bio,
       updated_at = NOW()
     RETURNING id, user_id, phone, location, headline, bio, created_at, updated_at`,
    [
      userId,
      profile.phone ?? null,
      profile.location ?? null,
      profile.headline ?? null,
      profile.bio ?? null,
    ],
  );

  return toCandidateProfile(rows[0]);
}

module.exports = {
  findByUserId,
  createOrUpdate,
};
