////////////////////////////////////////////////////////////////////////////////////

//Route-handler for Users
const multer = require('multer');
const sharp = require('sharp');
const User = require('./../model/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

// const multerStorage = multer.diskStorage({
//   // this destination is the callback function , which has access to (currentRequest,currently upload file , also an callbackfunction bit like a next() function in express (but this callback doen't come the express ))
//   destination: (req, file, cb) => {
//     //cb(error,actuall destination)
//     cb(null, 'public/img/users');
//   },
//   //(req,req.file,callback)
//   filename: (req, file, cb) => {
//     // user-userID-timestamp(filename)
//     // file.mimetype--> 'image/jpeg'
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   }
// });

const multerStorage = multer.memoryStorage(); //this way image will storaged as buffer (req.file.buffer)

// To check if the uploaded files are image or not
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Please upload only images.', 400), false);
  }
};
/**
 config-multer acc. to our need 
 -create one multer storage and one multer filter and use it 
 */

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadUserPhoto = upload.single('photo');

// To resize user photo
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

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
  // console.log(req.file);
  // console.log(req.body);

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
  if (req.file) filteredBody.photo = req.file.filename;
  // filename--> user-userId-timestamp
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

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'ERROR...',
    message: 'This route is not defined! Please use SignUp instead '
  });
};
/**
 updateUser for administration  to update all the user data
 */
exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
