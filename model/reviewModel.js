// review / rating / createdAt / ref to tour / ref to user
const mongoose = require('mongoose');
// const Tour = require('./tourModel');

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
const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
