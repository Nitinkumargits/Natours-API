// review / rating / createdAt / ref to tour / ref to user
const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty!']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    //what tour its belong too
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.']
    },
    //who wrote this review
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user']
    }
  },
  /**Virtual-property */
  /**
   fields that not store in database but calculated using someOther values ,we wnt this to also shownup whenever there is output 
   */
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);
/**
  - A review needs to belong to tour and also need an author(implementing parent referecing bcz both the tour and user are in sense the parent of this dataset),we decide todo this way bcz we are going to potentially huge array any parent element , we should not design our app thinking that there will only be a few review
  - when we donot really know how much our array will be grows then ist bst to opt for parent-referencing
 */

reviewSchema.pre(/^find/, function(next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name'
  // }).populate({
  //   path: 'user',
  //   select: 'name photo'
  // });
  this.populate({
    path: 'user',
    select: 'name photo'
  });
  next();
});

/**
 Calculating AverageRating on tour

 - we create a new function which will take in a tour id and calculate the avearge rating and the number of rating
 that exists in our collection for that exact tour, in end the function will even update the corresponding tour 
 document , in order to use that fucniton we'll use middleware to basically call tht fucntion each time when there is new review or one is updated or deleted 

 -function gonna be a static method on our schema , and that feature of mongoose 
 */
reviewSchema.statics.calcAverageRatings = async function(tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);
  // console.log(stats);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};

reviewSchema.index({ tour: 1, user: 1 }, { unique: true }); //each combination of tour and user is always to be unique

reviewSchema.post('save', function() {
  // this points to current review
  this.constructor.calcAverageRatings(this.tour);
});

// findByIdAndUpdate
// findByIdAndDelete
reviewSchema.pre(/^findOneAnd/, async function(next) {
  this.r = await this.findOne();
  // console.log(this.r);
  next();
});

reviewSchema.post(/^findOneAnd/, async function() {
  // await this.findOne(); does NOT work here, query has already executed
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
