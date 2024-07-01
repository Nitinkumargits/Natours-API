/**
 we will do most of the user-related stuff like,creating new user,loggin user in,
 updating password
 */
// const util = require('util'); //on this we using promisify method so...(Node have built in promisify func())
const crypto = require('crypto');
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

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    /**
     this means we can't manipulate the cookie inn the browser in any way not even delete it , if we wnat to use this secure way of storing cookie , then how we gona loggout user on  our website 
     bz usually with JWT-authentication we just delete the cookie or token from the local storage (not possible using this wayy )
     create a simple logout route that simply snt back a new cookie with exact same name but without the token 
     that will override the current cookie have in the browser with that has the same name but no token
     when that cookie snt along with the next request then will not be able to identify the user as being logged in then
     this will effectively log out user ,we gonna gift this cookie a very short expiration time 
     */
    httpOnly: true
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};
//---------------------------------------------------------
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
  //   signin in/logged in new user */
  //  const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
  //   expiresIn: process.env.JWT_EXPIRES_IN
  // });

  // createSendToken(newUser, 201, res);

  const token = signToken(newUser._id);

  res.status(201).json({
    status: 'success',
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
  const user = await User.findOne({ email }).select('+password');
  //user Document
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
  // const token = signToken(user._id);
  // res.status(200).json({ status: 'Success', token, user });
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};

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
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
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
  res.locals.user = currentUser;

  next();
});

// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );
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
        return next();
      }
      //if no problem in above step then next will be called,which will then get access to the route that we protected e.g- getAllToursHandler
      //Grant access to protected route
      req.user = currentUser;
      res.locals.user = currentUser;
      console.log(res.locals.user);
    } catch (err) {
      return next();
    }
  }
  next();
};

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
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1> Get user based on the token
  /**
   Reset token snt in url are not encrypted token, the one we have in DB is encrypted one ,
   now we need to encrypted the original token again so we can compare it with the one that is stored so the encrypted one in DB
   */
  const hasedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hasedToken,
    passwordResetExpires: { $gt: Date.now() } // passwordResetExpires greater than right now,bcz if the expires date greater than now,means its in the future,means it not expires yet
  });
  //2> If token has not expired, and there is user , set the new Password
  if (!user) {
    return next(new AppError('Token is invaild or has expired', 400));
  }
  //modify document
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined; //delete the reset token
  user.passwordResetExpires = undefined; //delete the reset expires
  //save the document
  await user.save();
  //3> Update changedPasswordAt property for the user
  //4> Log the user in , send JWT
  createSendToken(user, 200, res);
  // const token = signToken(user._id);
  // res.status(200).json({
  //   status: 'Success',
  //   token
  // });
});
/** only for logged-in user */
/**
  this password updating functionality  is only for logged-in user ,but still we need the user to pass in his currentPassword ,so inorder to confirm that user actually is who he say he is . (security measuere )

 */
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1> Get the user form the collection
  /**
   this updatePassword is only for authenticate ,So for logged in users, therefore at this point , we will  already have current user on request-object (comming from protect middleware)
   */
  const user = await User.findById(req.user.id).select('+password');
  // 2>check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }
  // 3> if so , update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will NOT work as intended!(.create() and .save())
  // 4> log user in , snd JWT
  createSendToken(user, 200, res);
});
