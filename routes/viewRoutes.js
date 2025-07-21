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

router.post(
  '/submit-user-data',
  authController.protect,
  viewsController.updateUserData
);

module.exports = router;
