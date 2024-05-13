const Tour = require('./../model/tourModel');

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

exports.createTour = async (req, res) => {
  try {
    //create a new Tour based on the data that come in from the body

    //how we created Document for new tour
    // const newTour = new Tour({});
    // newTour.save();//we call the method on new Document(newTour)

    //better way to create document
    //we call the create() method directly on the Tour model itself,create() return a promise
    const newTour = await Tour.create(req.body);

    res.status(200).json({
      status: 'SUCCESS',
      body: {
        tour: newTour
      }
    });
  } catch (err) {
    //when we are trying to creating document without one of the required fields i.e is the validation error ,it is one of the error we catched here
    res.status(400).json({
      status: 'Fail',
      message: 'Invalid data send'
    });
  }
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
