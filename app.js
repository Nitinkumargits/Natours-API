const express = require('express');
const morgon = require('morgan');

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
  //log to console each time there's a new  request
  console.log('HELLO from the middle ware');
  next();
});

app.use((req, res, next) => {
  req.reqestTime = new Date().toISOString();
  next();
});

//--------------------------------------------

//Mounting the router(mounting new-router(tourRouter middlerware,userRouter middlerware)  to route these two router will be a middlerware that's why we put inside app.use() in order to mount them)
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

module.exports = app;
