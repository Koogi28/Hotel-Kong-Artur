// Kobler URL'er til controller-funktioner. Ingen logik her.
const express = require('express');
const healthController = require('./controllers/healthController');
const bookingController = require('./controllers/bookingController');
const kpiController = require('./controllers/kpiController');
const barController = require('./controllers/barController');

const router = express.Router();

router.get('/api/health', healthController.getHealth);

router.get('/api/bookings', bookingController.list);
router.get('/api/bookings/:id', bookingController.get);
router.post('/api/bookings', bookingController.create);
router.put('/api/bookings/:id', bookingController.update);
router.delete('/api/bookings/:id', bookingController.remove);

router.get('/api/kpi/revenue/total', kpiController.revenueTotal);
router.get('/api/kpi/revenue/by-country', kpiController.revenueByCountry);
router.get('/api/kpi/revenue/by-room-type', kpiController.revenueByRoomType);
router.get('/api/kpi/revenue/by-season', kpiController.revenueBySeason);
router.get('/api/kpi/revenue/by-room-type-season', kpiController.revenueByRoomTypeSeason);
router.get('/api/kpi/occupancy', kpiController.occupancy);
router.get('/api/kpi/occupancy/nights', kpiController.occupancyNights);
router.get('/api/kpi/top-drinks', kpiController.topDrinks);

router.get('/api/bar/drinks', barController.listDrinks);
router.post('/api/bar/sales', barController.createSale);
router.get('/api/bar/kpi/total', barController.total);
router.get('/api/bar/kpi/revenue-by-drink', barController.revenueByDrink);
router.get('/api/bar/kpi/category-split', barController.categorySplit);

module.exports = router;
