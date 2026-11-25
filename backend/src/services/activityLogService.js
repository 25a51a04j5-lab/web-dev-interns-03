
const activityLogRepository = require('../repositories/activityLogRepository');

async function logActivity(actor, action, entity, details = {}) {
  if (!actor || !actor.id) {
    throw new Error('Activity actor is required');
  }

  if (!action || !entity) {
    throw new Error('Activity action and entity are required');
  }

  return activityLogRepository.create({
    actorId: actor.id,
    action,
    entity,
    details,
  });
}

async function getActivityLogs(filters = {}) {
  return activityLogRepository.list(filters);
}

module.exports = {
  logActivity,
  getActivityLogs,
};

