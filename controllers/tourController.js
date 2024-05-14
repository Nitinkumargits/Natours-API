//CRUD operation with MongoDB (performed in API)

const Tour = require('./../model/tourModel');

exports.getAllTours = async (req, res) => {
  try {
    /** 
    find()- to find all the document from the Tour-collection
   */
    const tours = await Tour.find();

    //send back all the tours to client
    res.status(200).json({
      status: 'success',
      results: tours.length,
      // data-property : so called envelope for our data
      data: {
        // tours:tours
        tours
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'Fail',
      message: err
    });
  }
};

exports.getTour = async (req, res) => {
  try {
    /**
      findById() -> same as Tour.findOne({ _id:req.params.id })
     */
    const tour = await Tour.findById(req.params.id);
    res.status(200).json({
      status: 'SUCCESS',
      data: {
        //data we want to send
        tours: tour
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'Fail',
      message: err
    });
  }
};

exports.createTour = async (req, res) => {
  try {
    /**    
     *  //create a new Tour based on the data that come in from the body

      //how we created Document for new tour
      // const newTour = new Tour({});
      // newTour.save();//we call the method on new Document(newTour)

      //better way to create document
      //we call the create() method directly on the Tour model itself,create() return a promise
     */

    const newTour = await Tour.create(req.body);

    res.status(200).json({
      status: 'SUCCESS',
      body: {
        tour: newTour
      }
    });
  } catch (err) {
    /**  
      //when we are trying to creating document without one of the required fields i.e is the validation error ,it is one of the error we catched here
     */
    res.status(400).json({
      status: 'Fail',
      message: err
    });
  }
};

exports.updateTour = async (req, res) => {
  try {
    /**
     - query for the document that we want to update based on id 
     - Tour.findByIdAndUpdate(id,Data we want to change,pass some options {new:true}->new update document will return )
      
      */

    const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      status: 'Succes',
      data: {
        // tour: tour
        tour
      }
    });
  } catch (err) {
    res.status(404).json({
      status: 'Fail',
      message: 'Invalid data send'
    });
  }
};

exports.deleteTour = async (req, res) => {
  try {
    await Tour.findByIdAndDelete(req.params.id);
    res.status(204).json({
      status: 'Succes',
      data: null //resource we deleted is no longer exist
    });
  } catch (err) {
    res.status(404).json({
      status: 'Fail',
      message: 'Invalid data send'
    });
  }
};
