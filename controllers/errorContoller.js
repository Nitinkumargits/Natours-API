/**
 handler are also called them  controller in context of MVC
 */

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, res) => {
  //Operational,trustederror: send  message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    //Programming and some other unknow error:don't want to leak detail to client

    //1>log error
    console.error('Error 👻👻👻', err);
    //2>send generic message
    res.status(500).json({
      status: 'fail',
      message: 'Something went very wrong'
    });
  }
};
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500; //500--internal server error
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    sendErrorProd(err, res);
  }
};
