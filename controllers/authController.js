/**
 we will do most of the user-related stuff like,creating new user,loggin user in,
 updating password
 */
const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const User = require('./../model/userModel');
const AppError = require('./../utils/appError');

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
