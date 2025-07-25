const Tour = require('../model/tourModel');
const User = require('../model/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Booking = require('../model/bookingModel');

exports.alerts = (req, res, next) => {
  const { alert } = req.query;
  console.log(alert);
  if (alert === 'booking') {
    res.locals.alert =
      'Your booking was successful ! If your booking does not show up here immediatly, please come back later.';
  }
  next();
};

exports.getOverview = catchAsync(async (req, res, next) => {
  // 1) Get tour data from collection
  const tours = await Tour.find();
  // 2) Build template
  // 3) Render that template using tour data from 1)
  res.status(200).render('overview', {
    title: 'All Tours ',
    tours
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // 1) Get the data, for the requested tour (including reviews and guides)
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user'
  });

  if (!tour) {
    return next(new AppError('There is no tour with that name.', 404));
  }

  // 2) Build template
  // 3) Render template using data from 1)
  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour
  });
});

exports.getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: 'Log into your account',
    user: req.user
  });
};

exports.getSignupForm = (req, res) => {
  res.status(200).render('signup', {
    title: 'sign Up',
    user: req.user
  });
};

exports.getForgotPasswordForm = (req, res) => {
  res.status(200).render('forgotPassword', {
    title: 'ForgotPassword'
  });
};

exports.renderResetPasswordForm = (req, res) => {
  const { token } = req.params;

  res.status(200).render('resetPassword', {
    title: 'Reset your password',
    token
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account'
  });
};

exports.updateUserData = catchAsync(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email
    },
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).render('account', {
    title: 'Your account',
    user: updatedUser
  });
});

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1) Find all bookings made by that specific user
  const bookings = await Booking.find({
    user: req.user.id
  });

  // 2 Find tours with the returned IDs
  const tourIDs = bookings.map(el => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIDs } }); // $in--> checks if the _id is present in the array tourIDs

  res.status(200).render('overview', {
    title: 'My Tours',
    tours
  });
});
