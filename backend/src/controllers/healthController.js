// Præsentationslag: GET /api/health
const healthService = require('../services/healthService');

async function getHealth(req, res) {
  const result = await healthService.check();
  res.status(result.status === 'ok' ? 200 : 503).json(result);
}

module.exports = { getHealth };
