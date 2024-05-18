class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'Fail' : 'error';
    //operational error (occur at future)
    this.isOperational = true; //so we can test for this property and only send error message back to client for this operational errors that we created using this AppError-class
    /** 
     each error get an stack Trace(err.stack) will show where erorr occurs,
     
     */
    Error.captureStackTrace(this, this.constructor); //when a new object is created, constructor() is call, that function call not appear in stackTrace
  }
}

module.exports = AppError;
