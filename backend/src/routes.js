// Kobler URL'er til controller-funktioner. Ingen logik her.
const express = require('express');
const healthController = require('./controllers/healthController');
const bookingController = require('./controllers/bookingController');

const router = express.Router();

router.get('/api/health', healthController.getHealth);

router.get('/api/bookings', bookingController.list);
router.get('/api/bookings/:id', bookingController.get);
router.post('/api/bookings', bookingController.create);
router.put('/api/bookings/:id', bookingController.update);
router.delete('/api/bookings/:id', bookingController.remove);

module.exports = router;
