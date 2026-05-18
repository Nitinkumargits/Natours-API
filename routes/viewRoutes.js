const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(viewsController.alerts);

// router.use(authController.isLoggedIn);
router.get('/', authController.isLoggedIn, viewsController.getOverview);

router.get('/tour/:slug', authController.isLoggedIn, viewsController.getTour);
router.get('/signup', authController.isLoggedIn, viewsController.getSignupForm);
router.get('/login', viewsController.getLoginForm);
router.get(
  '/forgotPassword',
  authController.isLoggedIn,
  viewsController.getForgotPasswordForm
);
router.get('/resetpassword/:token', viewsController.renderResetPasswordForm);

router.get('/me', authController.protect, viewsController.getAccount);

router.get('/my-tours', authController.protect, viewsController.getMyTours);
router.get('/my-reviews', authController.protect, viewsController.getMyReviews);
router.get('/my-billing', authController.protect, viewsController.getMyBilling);

router.post(
  '/submit-user-data',
  authController.protect,
  viewsController.updateUserData
);

// Admin-only view routes
router.get(
  '/manage-tours',
  authController.protect,
  authController.restrictTo('admin'),
  viewsController.getManageTours
);
router.get(
  '/manage-users',
  authController.protect,
  authController.restrictTo('admin'),
  viewsController.getManageUsers
);
router.get(
  '/manage-reviews',
  authController.protect,
  authController.restrictTo('admin'),
  viewsController.getManageReviews
);
router.get(
  '/manage-bookings',
  authController.protect,
  authController.restrictTo('admin'),
  viewsController.getManageBookings
);

module.exports = router;
