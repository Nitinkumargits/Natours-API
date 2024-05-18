/**
 handler are also called them  controller in context of MVC
 */

const AppError = require('../utils/appError');

/**
 * handleCastErrorDB
 {
    "status": "error",
    "error": {
        "stringValue": "\"wwwwww\"",
        "valueType": "string",
        "kind": "ObjectId",
        "value": "wwwwww",
        "path": "_id",
        "reason": {},
        "name": "CastError",
        "message": "Cast to ObjectId failed for value \"wwwwww\" (type string) at path \"_id\" for model \"Tour\""
    },
    "message": "Cast to ObjectId failed for value \"wwwwww\" (type string) at path \"_id\" for model \"Tour\"",
    "stack": "CastError: Cast to ObjectId failed for value \"wwwwww\" (type string) at path \"_id\" for model \"Tour\"\n    at model.Query.exec (D:\\2.1. Node\\NODE-APP\\Natours-API\\node_modules\\mongoose\\lib\\query.js:4498:21)\n    at Query.then (D:\\2.1. Node\\NODE-APP\\Natours-API\\node_modules\\mongoose\\lib\\query.js:4592:15)"
}
 */
const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400); //400-bad request
};

const handleDublicateDB = err => {
  const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
  const message = `Duplicate field value: ${value},Please use another value`;
  return new AppError(message, 400);
};

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
    /**
     we gonna pass the error that mongoose created into this handleCastErrorDB() func,this will return a new error created with our AppError class,that error than will marked as operational error,all the AppError have the isOperation=true automatically
     */
    let error = { ...err };
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === '11000') error = handleDublicateDB(error);
    sendErrorProd(error, res);
  }
};
