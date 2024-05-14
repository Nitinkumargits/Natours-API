const mongoose = require('mongoose');
/** MongoDB schema  */

const toursSchema = new mongoose.Schema({
  name: {
    type: String,
    require: [true, 'A tour must have Name'],
    unique: true,
    trim: true
  },
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
  ratingQuantity: {
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
    default: Date.now() //timestamp in milliseconds(represent current milliseconds)
  },
  //startsDate-> where differnt tour start(or diff date for same tour)/ diff instances of the tour starting on diff dates, not create automatically by MongoDB, MDB will try to parse the string that we parse in as a date into real JS-dates e.g "2024-05-14T09:04:43.039+00:00"
  startDates: [Date]
});
/** mongoDB Model */

const Tour = new mongoose.model('Tour', toursSchema);

module.exports = Tour;

/** 
  for ratingAverage/ratingsQuantity we didn't specify require field(schema type) bcz its not the user who create these tour,it will later calculated from real reviews
 */
