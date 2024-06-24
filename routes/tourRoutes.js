const express = require('express');
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');
// const reviewController = require('./../controllers/reviewController');
const reviewRouter = require('./../routes/reviewRoutes');

const router = express.Router();

/**Nested router */
/**
   // Post /tour/234afe/reviews
  // Get /tour/234afe/reviews
  // Get /tour/234afe/reviews/454ttf

  // router
  //   .route('/:tourId/reviews')
  //   .post(
  //     authController.protect,
  //     authController.restrictTo('user'),
  //     reviewController.createReview
  //   );
 */

/**
 - router itself is a middle ware so we can use .use() method on it then say that this specific route  '/:tourId/reviews' , we wnt to use the reviewRouter instead , agian it is actually mounting a router 
 -we will basically say that this tour-router should use the review-router in case it ever encouter with route like this 
 */
router.use('/:tourId/reviews', reviewRouter);

/** 
  for top-5-cheap
  get(middleware,route handler )
 */
router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);

router.route('/monthly-plan/:year').get(tourController.getMonthlyPlan);

router
  .route('/')
  .get(authController.protect, tourController.getAllTours)
  .post(tourController.createTour);
router
  .route('/:id')
  .get(tourController.getTour)
  .patch(tourController.updateTour)
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'), //only admin and lead-guide can delete tour
    tourController.deleteTour
  );

module.exports = router;
