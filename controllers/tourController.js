const fs = require('fs');

const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
);

exports.checkID = (req, res, next, val) => {
  console.log(`Tour id (from error handler) is : ${val} `);
  if (req.params.id * 1 > tours.length) {
    return res.status(404).json({
      status: 'FAIL',
      message: 'Invaild ID .'
    });
  }
  next();
};

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
    results: tours.length,
    requestedAt: req.reqestTime,
    // data-property : so called envelope for our data
    data: {
      // tours:tours
      tours
    }
  });
};

exports.getTour = (req, res) => {
  const idparams = req.params.id * 1;

  const tour = tours.find(el => el.id === idparams);

  res.status(200).json({
    status: 'SUCCESS',
    data: {
      //data we want to send
      tours: tour
    }
  });
};

exports.createTour = (req, res) => {
  const newId = tours[tours.length - 1].id + 1;

  const newTours = Object.assign({ id: newId }, req.body);
  tours.push(newTours);

  fs.writeFile(
    `${__dirname}/dev-data/data/tours-simple.json`,
    JSON.stringify(tours),
    err => {
      console.log(err);
      res.status(201).json({
        status: 'SUCCESS',
        body: {
          tours: newTours
        }
      });
    }
  );
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
