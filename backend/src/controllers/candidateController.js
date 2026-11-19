
const candidateService = require('../services/candidateService');
const AppError = require('../utils/AppError');

// Forward asynchronous errors to the central error handler.
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Get the logged-in candidate's profile.
const getMyProfile = wrap(async (req, res) => {
  const profile = await candidateService.getProfile(req.user.id);

  res.status(200).json({
    message: 'Candidate profile retrieved successfully',
    profile,
  });
});

// Create or update the logged-in candidate's profile.
const updateMyProfile = wrap(async (req, res) => {
  const profile = await candidateService.updateProfile(
    req.user.id,
    req.body,
  );

  res.status(200).json({
    message: 'Candidate profile updated successfully',
    profile,
  });
});

module.exports = {
  getMyProfile,
  updateMyProfile,
};
