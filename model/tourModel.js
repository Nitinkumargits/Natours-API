const mongoose = require('mongoose');
const slugify = require('slugify');
/** MongoDB schema  */

const toursSchema = new mongoose.Schema(
  //object for schema defination itself
  {
    name: {
      type: String,
      require: [true, 'A tour must have Name'],
      unique: true,
      trim: true
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
        'A tour must have the Difficulty <<Easy || medium || hard >>'
      ]
    },
    ratingsAverage: {
      type: Number,
      default: 4.5
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      require: [true, 'A tour must have price']
    },
    priceDiscount: Number,
    summary: {
      type: String,
      trim: true, //trim schema type only work for string(remove white space in begining and end)
      require: [true, 'A summary must be there bcz it in overview page']
    },
    description: {
      type: String,
      trim: true
    },
    imagecover: {
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
    startDates: [Date]
  },
  //object for schema-option
  {
    //Each time that data is outputted as JSON we want virtuall to be true(basically the virtual be the part of output)sm with object
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

//Virtual properties
/** 
  .virtual("name of the virtual properties")
  .get()->getter funtion this VP will created each time that we get some data out of DB , get(funciton-declaration) bcz we new this keyword

  we cannot use this virtual properties(eg-durationWeeks) in a query bz its not part of data base
 */
toursSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7;
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

toursSchema.pre('save', function(next) {
  console.log('will save document');
  next();
});

//Post MW->acces to the document that was just saved to database and next()
///post MW will executed after all pre-MW fucntion executed
toursSchema.post('save', function(doc, next) {
  console.log('Document:', doc);
  next();
});

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
