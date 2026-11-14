const database = require('../config/database');

const users = new Map();
let nextId = 1;

function toUser(row) {
  return row && {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

async function create({ name, email, passwordHash, role }) {
  if (database.isDatabaseConfigured()) {
    const { rows } = await database.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, password_hash, role, is_active, created_at`,
      [name, email, passwordHash, role],
    );
    return toUser(rows[0]);
  }

  const user = {
    id: nextId++,
    name,
    email,
    passwordHash,
    role,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  users.set(user.id, user);
  return { ...user };
}

async function findByEmail(email) {
  if (database.isDatabaseConfigured()) {
    const { rows } = await database.query(
      `SELECT id, name, email, password_hash, role, is_active, created_at
       FROM users
       WHERE email = $1`,
      [email],
    );
    return toUser(rows[0]);
  }

  for (const u of users.values()) if (u.email === email) return { ...u };
  return null;
}

async function findById(id) {
  if (database.isDatabaseConfigured()) {
    const { rows } = await database.query(
      `SELECT id, name, email, password_hash, role, is_active, created_at
       FROM users
       WHERE id = $1`,
      [id],
    );
    return toUser(rows[0]);
  }

  return users.get(Number(id)) ? { ...users.get(Number(id)) } : null;
}

async function list() {
  if (database.isDatabaseConfigured()) {
    const { rows } = await database.query(
      `SELECT id, name, email, password_hash, role, is_active, created_at
       FROM users
       ORDER BY id`,
    );
    return rows.map(toUser);
  }

  return [...users.values()].map((user) => ({ ...user }));
}

async function setActive(id, isActive) {
  if (database.isDatabaseConfigured()) {
    await database.query(
      `UPDATE users
       SET is_active = $2, updated_at = NOW()
       WHERE id = $1`,
      [id, isActive],
    );
    return;
  }

  const u = users.get(Number(id));
  if (u) u.isActive = isActive;
}

// Test helper only
function _reset() {
  if (database.isDatabaseConfigured()) return;
  users.clear();
  nextId = 1;
}

module.exports = { create, findByEmail, findById, list, setActive, _reset };
