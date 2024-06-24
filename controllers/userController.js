////////////////////////////////////////////////////////////////////////////////////

//Route-handler for Users
const User = require('./../model/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};
// exports.getAllUsers = catchAsync(async (req, res, next) => {
//   const user = await User.find();
//   //Send Response   back all the User to client
//   res.status(200).json({
//     status: 'success',
//     results: user.length,
//     // data-property : so called envelope for our data
//     data: {
//       user
//     }
//   });
// });
/**
  Allow the currenlty logged-in user to mainpulate his user data
  updateMe -> updating the current authenticated  user.

  updating the user-data in a different route than updating the user password bcz in a typical web-app that always how its done(usually have one place where you can update your password an another place where you can update data about the user or the account itself )
 */

exports.updateMe = catchAsync(async (req, res, next) => {
  //1> create error if user POSTed password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400
      )
    );
  }
  //2> Filtered out unwanted fields names that are not allowed to to update
  /**
   putting filteredBody instead on req.body we actually donot want to update everything in the body , eg body.role:"admin" this will allow any user to change the role eg administrater can't allow ,user can change resetTokenExpire

   filteredBody make sure it only conatin name and email(only field that you allowed to update)
   */
  const filteredBody = filterObj(req.body, 'name', 'email');
  //3> Update user document
  /**
   save method is not the correct option,instead we can do now use findByIdAndUpdate (we could not use this before bcz create and save ),but now we not dealing with password but only with the non-sensitive data like name and email

   */
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  /**already login user */
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({ status: 'success', data: null });
});
exports.getUser = factory.getOne(User);

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'ERROR...',
    message: 'This route is not defined! Please use SignUp instead '
  });
};
/**
 updateUser for administration  to update all the user data
 */
exports.getAllUsers = factory.getAll(User);
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
