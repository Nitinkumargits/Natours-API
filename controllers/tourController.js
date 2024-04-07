const fs = require('fs');

const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
);
exports.getAllTours = (req, res) => {
  //   console.log(req.reqestTime);
  //send back all the tours to client
  res.status(200).json({
    status: 'success',
    results: tours.length,
    requestedAt: req.reqestTime,
    // data-property : so called envelope for our data
    data: {
      // tours:tours
      tours,
    },
  });
};

exports.getTour = (req, res) => {
  console.log(req.params);

  const idparams = req.params.id * 1;

  const tour = tours.find((el) => el.id === idparams);

  //another way to handle error
  if (!tour) {
    return res.status(404).json({
      status: 'FAIL',
      message: 'Invaild ID .',
    });
  }

  res.status(200).json({
    status: 'SUCCESS',
    data: {
      //data we want to send
      tours: tour,
    },
  });
};
exports.createTour = (req, res) => {
  const newId = tours[tours.length - 1].id + 1;

  const newTours = Object.assign({ id: newId }, req.body);
  tours.push(newTours);

  fs.writeFile(
    `${__dirname}/dev-data/data/tours-simple.json`,
    JSON.stringify(tours),
    (err) => {
      res.status(201).json({
        status: 'SUCCESS',
        body: {
          tours: newTours,
        },
      });
    }
  );
};

exports.updateTour = (req, res) => {
  if (req.params.idparams * 1 > tours.length) {
    return res.status(404).json({
      status: 'FAIL',
      message: 'Invaild ID .',
    });
  }
  res.status(200).json({
    status: 'Succes',
    data: {
      tour: '<updated tours>', //real world we get the updated data back
    },
  });
};

exports.deleteTour = (req, res) => {
  if (req.params.idparams * 1 > tours.length) {
    return res.status(404).json({
      status: 'FAIL',
      message: 'Invaild ID .',
    });
  }
  res.status(204).json({
    status: 'Succes',
    data: null, //resource we deleted is no longer exist
  });
};
