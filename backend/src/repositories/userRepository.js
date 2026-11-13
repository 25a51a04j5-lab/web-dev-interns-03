// TEMPORARY in-memory store so the auth module runs and is testable on its own.
// Once Krishna's `users` migration is merged, replace the bodies of these functions with
// SQL queries (keep the same function names and return shapes, and nothing else changes).
//
// Expected `users` columns: id, name, email (unique), password_hash, role, is_active, created_at

const users = new Map();
let nextId = 1;

function publicShape(u) {
  return u && { ...u };
}

async function create({ name, email, passwordHash, role }) {
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
  return publicShape(user);
}

async function findByEmail(email) {
  for (const u of users.values()) if (u.email === email) return publicShape(u);
  return null;
}

async function findById(id) {
  return publicShape(users.get(Number(id)) || null);
}

async function list() {
  return [...users.values()].map(publicShape);
}

async function setActive(id, isActive) {
  const u = users.get(Number(id));
  if (u) u.isActive = isActive;
}

// Test helper only
function _reset() {
  users.clear();
  nextId = 1;
}

module.exports = { create, findByEmail, findById, list, setActive, _reset };
