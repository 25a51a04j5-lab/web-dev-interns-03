
const activityLogService = require('../services/activityLogService');

async function getActivityLogs(req, res, next) {
  try {
    const filters = {
      actorId: req.query.actorId,
      action: req.query.action,
      entity: req.query.entity,
    };

    const logs = await activityLogService.getActivityLogs(filters);

    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getActivityLogs,
};
