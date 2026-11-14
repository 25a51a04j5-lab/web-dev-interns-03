// Minimal Express app so the auth module runs and is testable on its own.
// Narendra owns the real app/server skeleton: when merging, just mount the two routers
// (see docs/auth-README.md) and keep the error handlers LAST.
const express = require('express');
const authRoutes = require('./routes/authRoutes');
const protectedRoutes = require('./routes/protectedRoutes');
const jobRoutes = require('./routes/jobRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api', protectedRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
