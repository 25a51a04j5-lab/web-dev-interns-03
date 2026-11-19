const path = require('path');

module.exports = {
  resumeDirectory: path.resolve(__dirname, '../../../uploads/resumes'),
  maxResumeBytes: 5 * 1024 * 1024,
  allowedResumeTypes: new Set(['application/pdf']),
};
