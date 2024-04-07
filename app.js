const fs = require('fs');
const express = require('express');
const app = express();
//middleWare
app.use(express.json());

const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/dev-data/data/tours-simple.json`)
);

const getAllTours = (req, res) => {
  //send back all the tours to client
  res.status(200).json({
    status: 'success',
    results: tours.length,
    // data-property : so called envelope for our data
    data: {
      // tours:tours
      tours,
    },
  });
};

const getTour = (req, res) => {
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
const createTour = (req, res) => {
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

const updateTour = (req, res) => {
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

const deleteTour = (req, res) => {
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
//in this we can chain the get and post method (handle dry)
// app.get('/api/v1/tours', getAllTours);//same as above
// app.post('/api/v1/tours', createTour);
// app.get('/api/v1/tours/:id', getTour);
// app.patch('/api/v1/tours/:id', updateTour);
// app.delete('/api/v1/tours/:id', deleteTour);
app.route('/api/v1/tours').get(getAllTours).post(createTour);
app
  .route('/api/v1/tours/:id')
  .get(getTour)
  .patch(updateTour)
  .delete(deleteTour);

const port = 3000;
app.listen(port, () => {
  console.log(`App start at port : ${port} 🚀🚀🚀`);
});
