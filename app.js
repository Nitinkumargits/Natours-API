const fs = require('fs');
const express = require('express');
const morgon = require('morgan');
const app = express();
/**-----------middleWare------------------------------*/
app.use(morgon('dev'));
/** 
 calling morgon() function will return function similar to this (req, res, next) => {};
 */
app.use(express.json());

app.use((req, res, next) => {
  //log to console each time there's a new  request
  console.log('HELLO from the middle ware');
  /** 
    never forget to use next in all middleware,if we didn't call next(),
    then the request/response cycle stuck at this point,we never able to send response to client
   */
  next();
});

app.use((req, res, next) => {
  //we hv route handler that really need the information when exactly requst happen,add something like this using middleware
  req.reqestTime = new Date().toISOString();
  next();
});

const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/dev-data/data/tours-simple.json`)
);
/**-----------Route-handler------------------------------*/
const getAllTours = (req, res) => {
  console.log(req.reqestTime);
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

/**-----------Routes------------------------------*/

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

/**-----------Start Server------------------------------*/
const port = 3000;
app.listen(port, () => {
  console.log(`App start at port : ${port} 🚀🚀🚀`);
});
