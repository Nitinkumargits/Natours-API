const express = require('express');
const bookingController = require('../controllers/bookingController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect); // All the routes(middlewares) after this middleware are protected
/**
 route we gonna create here not follow the REST principle bcz this not gonna about creating,deleting,and updating 
 this route only be for the client to get a checkout session 
 */

router.get('/checkout-session/:tourId', bookingController.getCheckoutSession);

// Stripe webhook route (must come BEFORE body-parser)
router.post(
  '/webhook-checkout',
  express.raw({ type: 'application/json' }),
  bookingController.webhookCheckout
);

// router.get(
//   '/checkout-session/:tourId',
//   bookingController.getCheckoutSession
//   bookingController.createBookingCheckout
// );

router.use(authController.restrictTo('admin', 'lead-guide')); // Only admin can access the routes below this middleware

router
  .route('/')
  .get(bookingController.getAllBookings)
  .post(bookingController.createBooking);

router
  .route('/:id')
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking)
  .delete(bookingController.deleteBooking);

module.exports = router;
