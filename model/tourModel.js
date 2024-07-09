/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable new-cap */

const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel');
// const validator = require('validator');
/** MongoDB schema  */

const toursSchema = new mongoose.Schema(
  //object for schema defination itself
  {
    name: {
      type: String,
      require: [true, 'A tour must have Name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour must have less or equal to 40 characters'],
      minlength: [10, 'A tour must have more or equal to 10 characters']
      //validator-package
      // validate: [validator.isAlpha, 'Tour name must be contain character']//it remove the spaces b/w name not needed
    },
    slug: String,
    duration: {
      type: Number,
      require: [true, 'A tour must have Duration'] //validator
    },
    maxGroupSize: {
      type: Number,
      require: [true, 'A tour must have a Group Size']
    },
    difficulty: {
      type: String,
      require: [
        true,
        'A tour must have the Difficulty <<Easy || medium || difficult >>'
      ],
      //data-validation(enum is only for strings )
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either easy,medium and difficult'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      //data-validation(for number and dates)
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      //this function will be run each time that a new value is set for this field , we usually specifiy callback function which receive the current value
      set: val => Math.round(val * 10) / 10 // 4.66666,46.666, 47, 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      require: [true, 'A tour must have price']
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function(val) {
          // this-keyword only points to currents doc on NEW document creation(not for update)
          return val < this.price; // priceDiscount is 100 < real price 200 -- return true
        },
        message: 'Discount price ({VALUE}) should be below the regular price' //VALUE=val
      }
    },
    summary: {
      type: String,
      trim: true, //trim schema type only work for string(remove white space in begining and end)
      require: [true, 'A summary must be there bcz it in overview page']
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String, //name of the image, which we able to read from the file system, reference will be stored in DB
      //We leave the image somewhere in the file system and put the name of image of itself in the DB as field
      require: [true, 'A tour must have the cover image']
    },
    //to store image as array of strings
    images: [String],
    //createAt is timeStamp that is set by the time that a user get a new tour(must created automatically)
    createAt: {
      type: Date,
      default: Date.now(), //timestamp in milliseconds(represent current milliseconds)
      select: false //not want in res-json
    },
    //startsDate-> where differnt tour start(or diff date for same tour)/ diff instances of the tour starting on diff dates, not create automatically by MongoDB, MDB will try to parse the string that we parse in as a date into real JS-dates e.g "2024-05-14T09:04:43.039+00:00"
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false
    },
    /** GeoSpatial Data */
    /**
        MongoDB support GeoSpatial Data out of the box-> data that describe places on earth using longitude and longitude coordinates so we can simple descibe point and describe diff complex geomertry like polygon , multi-polygon 

        - MongoDB use specail data format GeoJSON
        - startLocation is not really an document itself , it just an object descirbe certain point on eart 
   */
    startLocation: {
      //GeoJSON(this obj is not for schema type options it is embedded obj)
      type: {
        type: String,
        default: 'Point', //polygon or geometry
        enum: ['Point']
      },
      coordinates: [Number], //array (latitude,longitude)
      address: String,
      description: String
    },
    /** 
     - in order to create new document and then embed them into another document we need to create an array 
     - this is how you create embedded document , always need to use the array , by specifying an array of objects,this will create brand new documents inside of parent document which is 
     in this case tour
     */
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number], //array (latitude,longitude)
        address: String,
        description: String,
        day: Number // date of the tour in which people will goto this location
      }
    ],
    /**Emebedded */
    /**
       - idea here is that when creating a new tour document ,user will simply add an array  of user IDs, and will get  the corresponding user-document based on these idS and then add them to our tour document,means we embeded them 
      into our tour
    */
    //  guides: Array
    /**
      Referecing
      - Idea is that tour and user will always remain compeletly separated entities in our DB, so all we save the certain tour-document is the IDs of the user that are tour-guides for that specific tour then when we query the tour, we want to automatically get access to tour guides but again , without them being actually saved on the tour document itself that exactly is referecing 
    */
    /** populate */
    /**
      -in order to replace the fields that we referenced with the actual related data and the result we looked as if the data has always been embedded ,but as we know it is in different collection, Now the populate process always happen in query i.e tourController 
      - this guides field only contain the reference with populate we're gonna fill it up with the actual data but 
      only in the query not in actual database 
     */
    guides: [
      //embedded document/sub-document
      {
        type: mongoose.Schema.ObjectId, //we expected a type of each of the elements in the guides array to be a  mongoDB ID
        ref: 'User' // these how we establish references between different data set in Mongoose
      }
    ]
  },
  //object for schema-option
  {
    //Each time that data is outputted as JSON we want virtuall to be true(basically the virtual be the part of output)sm with object
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

/**Indexing */
/**
  1= sorting price-index acending order 
  -1= decending order
 */
toursSchema.index({ price: 1, ratingsAverage: -1 });
toursSchema.index({ slug: 1 });
toursSchema.index({ startLocation: '2dsphere' });

//Virtual properties
/** 
  .virtual("name of the virtual properties")
  .get()->getter funtion this VP will created each time that we get some data out of DB , get(funciton-declaration) bcz we new this keyword

  we cannot use this virtual properties(eg-durationWeeks) in a query bz its not part of data base
 */
toursSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7;
});

toursSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id'
});

//Mongoose-Document middleware

/**
  .pre("event",callbackfuntion()) - for pre-middle ware run before an actual event(.save() and .create()[if you use .insertMany comand  it will not tiggered the save() command]),callbackfuntion we call before the actual document save to DB
  
*/

toursSchema.pre('save', function(next) {
  // console.log(this); //will point to currenlty save document
  // 3> we will create slug for each of these document(slug is string that we put in the URL usally base on some string like eg name: 'The Test tour for Document Middleware',)
  // 4>  we use slugify package
  // 5> slug must be in schema to saved in DB

  this.slug = slugify(this.name, { lower: true });
  next();
});
/**middle ware for Embedded for tour guides */
/** 
 create a new tour with two new guides ,once we saved this tour, behind the scenes,retrieve the two user document corresponding to these two IDs,pre-save middle ware will automatically behing the scene each time a new tour is saved 
 */
// toursSchema.pre('save', async function(next) {
//   //guidesPromises variable is now full promise array
//   const guidesPromises = this.guides.map(async id => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });
/**
  - this above simple code work for creating new documents , not for updating so we have to implement the same logic also for update ,not going to do, bcz there are some drawback of embedding the data in this case 
  eg=> image a tour guide update his email address ,or change role from guides to lead-guide Each time one of these chages would happen then you have to check if a tour has that user as guide, and if so then update the tour as well lot of work not go in that direction , thats how we do embedding but in this case instead of 
  embedding we do referencing 
 */

toursSchema.pre('save', function(next) {
  // console.log('will save document');
  next();
});

//Post MW->acces to the document that was just saved to database and next()
///post MW will executed after all pre-MW fucntion executed
toursSchema.post('save', function(doc, next) {
  // console.log('Document:', doc);
  next();
});
//////////////////////////////////////////////////////////////////////////////////////////////

//Query Middleware
/**
 let suppose we can have secret tours in our database(tours that offer internallylike VIP gp of people ,public shouldn't know about),so this secret tour we don't want to appear in result output,
 -we gonna create a secret tour field and then query only for those tour that are not  secret 

 -we using find-query(Tour.find() in   const features = new APIFeatures(Tour.find()>>here, req.query)) there for find-hook is executed 
 */
toursSchema.pre(/^find/, function(next) {
  //this-keyword point to crurrent query not the document , "this" is the query-obj so that we can chain all of the query
  this.find({ secretTour: { $ne: true } }); //other tours are not currently set to false
  this.start = Date.now();
  next();
});
toursSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt'
  });
  next();
});
/**
 post query-Middleware run after query get executed,so it can access document that were return, bcz query finished at this point
 */
toursSchema.post(/^find/, function(docs, next) {
  // eslint-disable-next-line no-console
  // console.log(`Query took ${Date.now() - this.start} millisecond`);
  // console.log('Query docs:', docs);
  next();
});

/** 
 Aggregation Middleware
 
 -
 */

// toursSchema.pre('aggregate', function(next) {
//   console.log(this); //point to current aggregation
//   console.log(this.pipeline());
//   /**
//        Aggregate {
//       _pipeline: [
//         { '$match': [Object] },
//         { '$group': [Object] },
//         { '$sort': [Object] }
//       ],
//       _model: Model { Tour },
//       options: {}
//     }
//     [
//       { '$match': { ratingsAverage: [Object] } },
//       {
//         '$group': {
//           _id: [Object],
//           numTours: [Object],
//           numRatings: [Object],
//           avgRating: [Object],
//           avgPrice: [Object],
//           minPrice: [Object],
//           maxPrice: [Object]
//         }
//       },
//       { '$sort': { avgPrice: 1 } }
//     ]
//    */

//   //In order to filter out the secret tour all we have to do is to add another match stages write at the beggin of pipeline array
//   //unshift - to add ele at beggin of the array
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   next();
// });
/** mongoDB Model */
const Tour = new mongoose.model('Tour', toursSchema);

module.exports = Tour;

/** 
 
  for ratingAverage/ratingsQuantity we didn't specify require field(schema type) bcz its not the user who create these tour,it will later calculated from real reviews
 */
/**
 1>
  console.log(this)::from document middleware
  this how our document look like right before saved into DataBase

  {
  ratingsAverage: 4.5,
  ratingsQuantity: 0,
  images: [],
  createAt: 2024-05-16T13:03:05.773Z,    
  startDates: [],
  _id: 6646050a35a7bd43d4d256d8,
  name: 'The Test tour for Document Middleware',
  duration: 1,
  maxGroupSize: 1,
  difficulty: 'difficulty',
  price: 1,
  summary: 'Test tour',
  durationWeeks: 0.14285714285714285,   //you can see the Virtual property  
  id: '6646050a35a7bd43d4d256d8'
 } 
2>
 this is right before the we actually save this data into database at this point of time we can  still act on the data before it is then saved to the data base
 */
