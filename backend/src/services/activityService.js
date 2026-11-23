
const { query } = require('../config/database');

function getId(value, fieldName, nullable = false) {
  if (value === null || value === undefined) {
    if (nullable) return null;
    throw new TypeError(`${fieldName} is required`);
  }

  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new TypeError(`${fieldName} must be a positive integer`);
  }

  return id;
}

/**
 * Records an activity in the shared activity_logs table.
 *
 * @param {object|number|null} actor - User object or user ID.
 * @param {string} action - Action performed.
 * @param {{type: string, id?: number|null}} entity - Affected entity.
 * @param {object} details - Additional activity metadata.
 */
async function logActivity(actor, action, entity, details = {}) {
  const actorId = actor === null
    ? null
    : getId(typeof actor === 'object' ? actor.id : actor, 'Actor ID', true);

  if (typeof action !== 'string' || !action.trim() || action.length > 120) {
    throw new TypeError('Action must be a non-empty string of at most 120 characters');
  }

  if (!entity || typeof entity !== 'object' || Array.isArray(entity)) {
    throw new TypeError('Entity must be an object containing type and id');
  }

  const entityType = entity.type;

  if (
    typeof entityType !== 'string' ||
    !entityType.trim() ||
    entityType.length > 80
  ) {
    throw new TypeError('Entity type must be a non-empty string of at most 80 characters');
  }

  const entityId = getId(entity.id, 'Entity ID', true);

  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    throw new TypeError('Activity details must be an object');
  }

  const metadata = JSON.stringify(details);

  const result = await query(
    `INSERT INTO activity_logs
      (actor_id, action, entity_type, entity_id, metadata)
     VALUES (?, ?, ?, ?, ?)`,
    [actorId, action.trim(), entityType.trim(), entityId, metadata],
  );

  return {
    id: result.insertId,
    actorId,
    action: action.trim(),
    entityType: entityType.trim(),
    entityId,
    details,
  };
}

module.exports = { logActivity };
