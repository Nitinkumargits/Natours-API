/* eslint-disable import/newline-after-import */
/* eslint-disable import/order */
/* eslint-disable import/no-extraneous-dependencies */
const path = require('path');
const express = require('express');
const morgon = require('morgan');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorContoller');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

// eslint-disable-next-line import/no-extraneous-dependencies
const hpp = require('hpp');
const viewRouter = require('./routes/viewRoutes');
const cookieParser = require('cookie-parser');

const app = express();

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
// const cors = require('cors');

/**----------Global-middleWare-------------------------*/
/**Set security HTTP-Header */
app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      baseUri: ["'self'"],
      defaultSrc: ["'self'", 'http:', 'https:', 'ws:', 'blob:', 'data:'],
      fontSrc: ["'self'", 'https:', 'data:'],
      scriptSrc: ["'self'", 'https:', 'blob:'],
      objectSrc: ["'none'"],
      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
      upgradeInsecureRequests: []
    }
  })
);

/**---------- for static file like (html,css,img) -------------------------*/
// app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));

/**---------- Setting PUG -------------------------*/
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

/**Develpment logging */
if (process.env.NODE_ENV === 'development') {
  // these middleware we want to apply to all the routes
  app.use(morgon('dev'));
}

//Limit-request-middleware function from same API
const limiter = rateLimit({
  max: 100, //allow 100request form the same IP in one hour(if you building an API ,need lot of request for one IP,the max number should be greater)
  windowMs: 60 * 60 * 1000, // 1hour,
  message: 'Too many request form this IP , Please try again in 1hour'
});
app.use('/api', limiter);

//Body parser, reading data form the body into req.body
app.use(express.json({ limit: '10kb' }));
//cookie-parser
app.use(cookieParser());

// Data sanitization against NoSQL query injection(remove any mongo-operator(like $))
app.use(mongoSanitize());
// Data sanitization against XSS(clean malicious html-code)
app.use(xss());

//Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'price'
    ]
  })
);

//--------------------------------------------
/**Mounting the router ( integrate with API )*/
/**
  //Mounting the router(mounting new-router(tourRouter middlerware,userRouter middlerware)  to route these two router will be a middlerware that's why we put inside app.use() in order to mount them)
 */
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);
//----------------------------------------------
//Test midddleWare
app.use((req, res, next) => {
  req.reqestTime = new Date().toISOString();
  /**protected routes */
  // console.log('req-header : ', req.headers); //the one client snd along with there request
  // console.log('cookies :', req.cookies);
  // console.log('req.user :', req.user);
  next();
});
/** Handling Unhandle Route */
//reach here means neither teh tourRouter/UserRouter able to catch it
/** 
 .all() - have all the https methods(get,post,push,update,delete),
 *-means every URL
 .all('URL',Middlewate funtion(){})
 >> if we able to reach this point herethat its means that request-response cycle was not yet finished at this point of our code,MW will added to middleware stack in order that its define in our code
 */

app.all('*', (req, res, next) => {
  /**
   
    // res.status(404).json({
    //   status: 'fail',
    //   message: `Can't find ${req.originalUrl} on this server`
    // });
   */
  //----------------------------------------------------------------------------
  //3>create an error for global error
  // const err = new Error(`Can't find ${req.originalUrl} on this server`); //err.message
  // err.status = 'Fail';
  // err.statusCode = 404;
  //create error inside the next() with appErorr-class
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));

  /**
   //if the next() fun recive an argument no matter where it is,express will automaticall know that it was an error,so it will asume whatever we pass it into next is gonna be error , that apply to every next() fun in every middleware,any where in our application
   when ever we pass anything into next(),it assume to be an error,then it will skip all the other middleware in MW stack and send the error we passed in to our global error handling middleware
   */
});
/** Global Error handling-Middleware */
/**
  4-arguments(an express will recogine it as errorHandling middleware therefore only call it when there's an error
  1arg- error
)

  /steps
  1>create a middleware
  2>create error so that this Middlware-funtion will caught it

 */

app.use(globalErrorHandler);

module.exports = app;
