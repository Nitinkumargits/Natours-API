////////////////////////////////////////////////////////////////////////////////////

//Route-handler for Users
const User = require('./../model/userModel');
const catchAsync = require('./../utils/catchAsync');
// const AppError = require('./../utils/appError');

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const user = await User.find();
  //Send Response   back all the User to client
  res.status(200).json({
    status: 'success',
    results: user.length,
    // data-property : so called envelope for our data
    data: {
      user
    }
  });
});
exports.getUser = (req, res) => {
  res.status(500).json({
    status: 'ERROR...',
    message: 'Internal Server error ☠☠☠☠'
  });
};
exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'ERROR...',
    message: 'Internal Server error ☠☠☠☠'
  });
};
exports.updateUser = (req, res) => {
  res.status(500).json({
    status: 'ERROR...',
    message: 'Internal Server error ☠☠☠☠'
  });
};
exports.deleteUser = (req, res) => {
  res.status(500).json({
    status: 'ERROR...',
    message: 'Internal Server error ☠☠☠☠'
  });
};
