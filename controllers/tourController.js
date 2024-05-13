const Tour = require('./../model/tourModel');

exports.checkBody = (req, res, next) => {
  if (!req.body.name || !req.body.price) {
    return res.status(400).json({
      status: 'Fail',
      message: 'Missing name and price 🤑'
    });
  }
  //if correct then move to next middleware that must be createTour
  next();
};

exports.getAllTours = (req, res) => {
  console.log(req.reqestTime);
  //send back all the tours to client
  res.status(200).json({
    status: 'success',
    // results: tours.length,
    requestedAt: req.reqestTime
    // data-property : so called envelope for our data
    // data: {
    //   // tours:tours
    //   tours
    // }
  });
};

exports.getTour = (req, res) => {
  // const idparams = req.params.id * 1;

  res.status(200).json({
    status: 'SUCCESS'
    // data: {
    //   //data we want to send
    //   tours: tour
    // }
  });
};

exports.createTour = (req, res) => {
  res.status(201).json({
    status: 'SUCCESS'
    // body: {
    //   tours: newTours
    // }
  });
};

exports.updateTour = (req, res) => {
  res.status(200).json({
    status: 'Succes',
    data: {
      tour: '<updated tours>' //real world we get the updated data back
    }
  });
};

exports.deleteTour = (req, res) => {
  res.status(204).json({
    status: 'Succes',
    data: null //resource we deleted is no longer exist
  });
};
