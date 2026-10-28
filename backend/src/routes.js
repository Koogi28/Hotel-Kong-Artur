// Kobler URL'er til controller-funktioner. Ingen logik her.
const express = require('express');
const healthController = require('./controllers/healthController');

const router = express.Router();

router.get('/api/health', healthController.getHealth);

module.exports = router;
