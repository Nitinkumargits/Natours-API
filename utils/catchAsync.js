/**Catch Async errors */

// const catchAsync = fn => {
module.exports = fn => {
  // **>anonymous function ,which will asign to create tour

  return (req, res, next) => {
    fn(req, res, next).catch(err => next(err)); //error will ends up in golbal handling middleware
  };
};
