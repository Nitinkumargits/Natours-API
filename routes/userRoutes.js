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
/**logout */
router.get('/logout', authContoller.logout);
//--------------------------------------------------------------
/**Password Reset routes */
router.post('/forgotPassword', authContoller.forgotPassword); //will only receive the email address
router.patch('/resetPassword/:token', authContoller.resetPassword); // will receive the token as well as new Password

//--------------------------------------------------------------
//--------------------------------------------------------------
//protect all routes after this middleware
//middleware that  add to all the routes that come after this ....
router.use(authContoller.protect);
//--------------------------------------------------------------
router.patch('/updateMyPassword', authContoller.updatePassword);
//--------------------------------------------------------------
router.get('/me', userController.getMe, userController.getUser);
//--------------------------------------------------------------
//it is a protected route only the currently authenticated user can update data of the current-user,it is secure bcz the id of the user thats is gonna be updated come form the req.user(which was set by protect-middleWare ,which in turn  got the id from the jsonWebToken , Since no one change the in the JWT without knowing the secret ,then ID is safe )
router.patch('/updateMe', userController.updateMe);
//--------------------------------------------------------------
router.delete('/deleteMe', userController.deleteMe);
//--------------------------------------------------------------
//after this route all the routes are protected and restricted to only admin
router.use(authContoller.restrictTo('admin'));
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
