const express = require('express');
const morgon = require('morgan');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorContoller');

const app = express();

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

/**-----------middleWare-------------------------*/
if (process.env.NODE_ENV === 'development') {
  // these middleware we want to apply to all the routes
  app.use(morgon('dev'));
}

app.use(express.json());

//for static file like (html,css,img)
app.use(express.static(`${__dirname}/public`));

app.use((req, res, next) => {
  req.reqestTime = new Date().toISOString();
  next();
});

//--------------------------------------------
/**Mounting the router */
/**
  //Mounting the router(mounting new-router(tourRouter middlerware,userRouter middlerware)  to route these two router will be a middlerware that's why we put inside app.use() in order to mount them)
 */
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
//----------------------------------------------
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
