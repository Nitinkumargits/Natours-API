/**
 handler are also called them  controller in context of MVC
 */

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500; //500--internal server error
  err.status = err.status || 'error';

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message
  });
};
