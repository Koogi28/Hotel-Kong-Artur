// Forretningslag: afgør om systemet er sundt (databasen svarer).
const healthRepository = require('../repositories/healthRepository');

async function check() {
  try {
    await healthRepository.ping();
    return { status: 'ok' };
  } catch (err) {
    console.error('Health-tjek fejlede:', err.message);
    return { status: 'error' };
  }
}

module.exports = { check };
