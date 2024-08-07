//CRUD operation with MongoDB (performed in API)
const multer = require('multer');
const sharp = require('sharp');
const Tour = require('./../model/tourModel');
// const APIFeatures = require('./../utils/APIFeatures');/
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

const multerStorage = multer.memoryStorage();

// To check if the uploaded files are image or not
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

// upload.array('images', 3)--> For multiple files(single filed)
// upload.single('image')--> For a single file

// Multiple files(multiple fields)or mixied fields
exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 }, //only have one feild clld imageCover which going to process
  { name: 'images', maxCount: 3 }
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  // console.log(req.files);
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Cover image
  req.body.imageCover = `tour-${req.params.id}-cover.jpeg`; // DB
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2) Images
  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, index) => {
      const fileName = `tour-${req.params.id}-${index + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${fileName}`);

      req.body.images.push(fileName);
    })
  );
  next();
});

// top-5-cheap ////////////////////////////////////////////////////
//middleware('/top-5-cheap' route)
exports.aliasTopTours = (req, res, next) => {
  //maniputlate the query object or prefill(?limit=5&sort=-ratingsAverage,price)
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,difficulty,ratingsAverage,summary';
  next();
};
// exports.getAllTours = catchAsync(async (req, res, next) => {
//   //---------------excute the query------------------------------------------

//   //new APIFeatures(query-Object,queryString comming from exprsess)
//   const features = new APIFeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();
//   const tours = await features.query;

//   //Send Response   back all the tours to client
//   res.status(200).json({
//     status: 'success',
//     results: tours.length,
//     // data-property : so called envelope for our data
//     data: {
//       // tours:tours
//       tours
//     }
//   });
// });
exports.getAllTours = factory.getAll(Tour);
// exports.getTour = catchAsync(async (req, res, next) => {
//   /**
//       findById() -> same as Tour.findOne({ _id:req.params.id })
//   */
//   /**
//     - // name of the field that we want to populate i.e field calld guides in our model , with populate we actully wnt to fill the data
//     -this populate fuction is absolutely fundamental tool for working with data in mongoose and when there are realtionship with data
//     -behind the scenes , using populate will still actually create a new query ,it may affect your performace
//   */
//   const tour = await Tour.findById(req.params.id).populate('reviews');

//   /**Handle by global Error Handle  */
//   if (!tour) {
//     return next(new AppError('No Tour find with the ID', 404));
//   }

//   res.status(200).json({
//     status: 'SUCCESS',
//     data: {
//       //data we want to send
//       tours: tour
//     }
//   });
// });
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
/**
 In order to rid of try/catch we simply wrapp our async funtion inside of catchAsync() this func will return new anonymous function(**)
 */
// exports.createTour = catchAsync(async (req, res, next) => {
//   /**
//    *  //create a new Tour based on the data that come in from the body

//     //how we created Document for new tour
//     // const newTour = new Tour({});
//     // newTour.save();//we call the method on new Document(newTour)

//     //better way to create document
//     //we call the create() method directly on the Tour model itself,create() return a promise
//    */

//   const newTour = await Tour.create(req.body);

//   res.status(200).json({
//     status: 'SUCCESS',
//     body: {
//       tour: newTour
//     }
//   });
// });

exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
// exports.updateTour = catchAsync(async (req, res, next) => {
//   /**
//      - query for the document that we want to update based on id
//      - Tour.findByIdAndUpdate(id,Data we want to change,pass some options {new:true}->new update document will return )
//     */
//   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     runValidators: true
//   });
//   /**Handle by global Error Handle  */
//   if (!tour) {
//     return next(new AppError('No Tour find with the ID', 404));
//   }

//   res.status(200).json({
//     status: 'Succes',
//     data: {
//       // tour: tour
//       tour
//     }
//   });
// });

exports.deleteTour = factory.deleteOne(Tour);
// exports.deleteTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndDelete(req.params.id);
//   /**Handle by global Error Handle  */
//   if (!tour) {
//     return next(new AppError('No Tour find with the ID', 404));
//   }
//   res.status(204).json({
//     status: 'Succes',
//     data: null //resource we deleted is no longer exist
//   });
// });

//Aggregation pipeline

//create fuction to calculate a couple of statistics about ours tours
/** 
 aggregation-pipline is bit like a bit like a regular query , the diff is that in aggregation we can manipulate the data in couple of different step for that we pass array of so-called stages(.aggregate([stage1,stage2])) the document then pass  through these stages one by one , step by step in the define sequence, so each of element in array is one of the stages

 stages:::
 $match- select and fileter certain documents (kind of preliminary stage for next stages)
 $group- it allows us to group document together using accumulator(e.g calc average--- if we have five tours each of them have rating we then calc avearge rating using $group)

 _id =null >>> we want to have everything in the one group so that we can calc statistic together not separate it by its group

 name of the filed -"$ratingsAverage"/'$price'
  numTours: { $sum: 1 } 1 will addd to numTours-counter
*/

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 } //1-accending
    }
    // {
    //   //repeat stages
    //   $match: { $ne: '$EASY' } //$ne -- not easys(select all document that are not easy(excluding easy))
    // }
  ]);

  res.status(200).json({
    status: 'Succes',
    data: {
      stats
    }
  });
});

//Business problem

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; //2021
  const plan = await Tour.aggregate([
    //stages-1
    {
      $unwind: '$startDates'
    },
    //stages-2 ($match -> to select document)
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`), //january current year
          $lte: new Date(`${year}-12-31`) //till dec current year
        }
      }
    },
    //stages-3
    {
      $group: {
        //_id : basically to say what we want use to group our document (gruping them by month)
        _id: { $month: '$startDates' },
        //the real infomation,for each of the month is how many tours start in that month-> so we have to count the amount the tours that we have certain month
        numTourStart: { $sum: 1 },
        // push diff tour in array
        tour: { $push: '$name' }
      }
    },
    //stages-4 (Add field)
    {
      $addFields: { month: '$_id' }
    },
    //stages-5 (To remove the _id) -- 0 for remove ,1 for show in res-json
    {
      $project: { _id: 0 }
    },
    //stages-6
    {
      $sort: { numTourStart: -1 } // 1-accending || -1 for descending(starting with highest number)
    },
    //stages-7
    {
      $limit: 12 //only 12 document
    }
  ]);

  res.status(200).json({
    stauts: 'Success ✅✅✅✅✅',
    data: {
      plan
    }
  });
});

/**
 * 
  {
     "startDates": [
                    "2021-04-25T04:30:00.000Z",
                    "2021-07-20T04:30:00.000Z",
                    "2021-10-05T04:30:00.000Z"
                ],
     "_id": "6645a1764477044708f0a5e2",
    "name": "The Forest Hiker",
              }
 */

/**
 $unwind: is basically deconstruct an array field from the input document than output one document form the each of the array
  */

/**
 * 
 * //we have one document (the forest hiker) for each of the dates
     "stauts": "Success ✅✅✅✅✅",
    "data": {
        "plan": [
            {
                ..
                ..
                "createAt": "2024-05-16T06:02:30.039Z",
                "startDates": "2021-04-25T04:30:00.000Z",
                "name": "The Forest Hiker",
                .
                .
            
            },
            {
                
                "createAt": "2024-05-16T06:02:30.039Z",
                "startDates": "2021-07-20T04:30:00.000Z",
                "name": "The Forest Hiker",
            }
         
  */

// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/34.111745,-118.113491/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitutr and longitude in the format lat,lng.',
        400
      )
    );
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours
    }
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitutr and longitude in the format lat,lng.',
        400
      )
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1]
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances
    }
  });
});
