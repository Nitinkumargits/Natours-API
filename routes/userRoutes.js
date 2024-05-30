const express = require('express');
const userController = require('./../controllers/userController');
const authContoller = require('./../controllers/authController');

const router = express.Router();
//--------------------------------------------------------------
/**
 signup is really special-endpoint,doesn't fit REST-architecture,
 for signup we only POST-data to create new user
 */
router.post('/signup', authContoller.signup);

/**login user */
// POST-req we want to send login credentials in body
router.post('/login', authContoller.login);
//--------------------------------------------------------------
/**Password Reset routes */

router.post('/forgotPassword', authContoller.forgotPassword); //will only receive the email address
router.patch('/resetPassword/:token', authContoller.resetPassword); // will receive the token as well as new Password
//--------------------------------------------------------------
router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);
router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);
//------------------------------------------------------------

module.exports = router;
