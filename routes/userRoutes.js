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
router.patch(
  '/updateMyPassword',
  authContoller.protect,
  authContoller.updatePassword
);
//--------------------------------------------------------------
//it is a protected route only the currently authenticated user can update data of the current-user,it is secure bcz the id of the user thats is gonna be updated come form the req.user(which was set by protect-middleWare ,which in turn  got the id from the jsonWebToken , Since no one change the in the JWT without knowing the secret ,then ID is safe )
router.patch('/updateMe', authContoller.protect, userController.updateMe);
//--------------------------------------------------------------
router.delete('/deleteMe', authContoller.protect, userController.deleteMe);
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
