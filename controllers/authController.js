/**
 we will do most of the user-related stuff like,creating new user,loggin user in,
 updating password
 */
// const util = require('util'); //on this we using promisify method so...(Node have built in promisify func())
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const User = require('./../model/userModel');
const AppError = require('./../utils/appError');
const sendEmail = require('./../utils/email');

const signToken = id => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};
exports.signup = catchAsync(async (req, res, next) => {
  /**
      .create(pass obj with data from which user should be created),
      User.create(req.body) return a promise so we should await that 
    */
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm
  });

  /**signin in/logged in new user */
  // const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
  //   expiresIn: process.env.JWT_EXPIRES_IN
  // });
  const token = signToken(newUser._id);

  res.status(201).json({
    status: 'Success',
    token,
    data: {
      user: newUser
    }
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  // 1> check if  email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password !', 400));
  }
  // 2> check if  user exist and password is correct
  /**
   //field and variable are same we can do this like  User.findOne({email}), this will not contain the password, but we do need the password(bcz we use password{select:false }in userModel) to check if itis correct,so we need to explicitly .select('+password') field that we needed like this it will back in the output
   */
  const user = await User.findOne({ email: email }).select('+password'); //user Document
  /**using instance method(available on all the user-document) */
  // const correct = await user.correctPassword(password, user.password); //give true/false
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect Email and Password', 401)); //401-unauthorise
  }
  /**
   console.log(user);
   {
      _id: 664e0c9e1829020ae86492ce,
      name: 'jonas',
      email: 'hello@jonas.io',
      // password present bcz of .select('+password')
      password: '$2a$12$yYr.P4dc8GT6HSjN412iie5.o5syj8WoYb.4p4qgzfrq/3Cuj6WC6',
      __v: 0
    }
   */
  /**
   how 
   "pass1234"==='$2a$12$yYr.P4dc8GT6HSjN412iie5.o5syj8WoYb.4p4qgzfrq/3Cuj6WC6'
   use the bcrypt package to generate the hash password and compare the password like above
   bcrypt encrypt(pass1234) this and then compare it - create that function in userModel bcz it realted to data itself
   */
  // 3> if everything okay send token(JWT) to client
  const token = signToken(user._id);
  res.status(200).json({ status: 'Success', token });
});

/** proctected Route middleWare */
exports.protect = catchAsync(async (req, res, next) => {
  // 1> Getting token and check for token if its there
  /**
   Common practices is to send a token using an http-header with the request
   */

  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    //condition which we want save the token
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }
  // 2> Validate/Verification the token(JWT algo verifiy , signature is valid or not, or token is expires,if someone manipulated the data)
  /**
   3rd arg of verify() func require a callback function,this callback is run as soon as verification is done,so the verify() is asynchronous function,so it will verifi a token aft that when its done it will call the callback function that we can specifiy,

   working promise all the time , we now promisifying this verifiy() func (promisify(jwt.verify)) basically, return a promise
   */
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  /**
   
    console.log(decoded); //{ id: '664e0c9e1829020ae86492ce (user-id) ', iat: 1716529423(creation/issueAt date), exp: 1724305423(expiration/expire date) }
 */
  /**
   Route not secure yet,what if the user deleted at mean time,so the token is still exist,but user is no longer existent well then we actually don't want to him login,what if the user change his password after the token is issued that also not work,
   imagin someone stole the JWTToken from the user,in order to protect against that the user changes his password ,the old token that was issued before the password change  should no longer be valid,it should not be accepted to access the protected route
   */
  // 3>check if  User is still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401
      )
    );
  }

  // 4> check if user change password if after the JWT/token was issued
  if (currentUser.changePasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently change password ! Please login again ', 401)
    );
  }
  //if no problem in above step then next will be called,which will then get access to the route that we protected e.g- getAllToursHandler
  //Grant access to protected route
  req.user = currentUser;
  next();
});
/**
 usually we cannot pass argument to middleware function, so we create a wrapper function,which will then return the middleware function that we actually wnt to create

 -> ...roles = create a array of all the argument that we specified 
 i.e roles= ['admin','lead-guid']

 ->req.user = currentUser; from the protect-route middleware
 ->403 : forbidden

 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

/**Password Reset functionality */

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1> Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no user with the email address ', 404));
  }
  // 2> Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); // this will deactivate all the validators that we specified in our schema

  // 3> send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit  a PATCH request with your new password  and passwordConfirm to :${resetURL}.\n If your didn't forgot your password please ignore this email !`;
  try {
    await sendEmail({
      email: user.email, //same as req.body.email,
      subject: 'Your password reset token (Valid for 10min )',
      message
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email'
    });
  } catch (err) {
    /**reset both token and expires property */
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There was an error sending an email. Try again later !',
        500
      )
    );
  }
});
exports.resetPassword = (req, res, next) => {};
