const fs = require('fs');
const express = require('express');
const app = express();
//middleWare
app.use(express.json());
/**
        ///2>express.json() is middleware,middleware is function that can modify the incoming request data,is called middleware bcz is stand b/w the req and res,its just a step that request request goes through while its being processed and the request goes through,is simply that the data from the body add to request obj by using middleware
 */

/**
 
    //JSON.parse so that it automatically converted to js obj or array of js-obj
 */
const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/dev-data/data/tours-simple.json`)
);
/**  
 
    //route handler-callback will run event loop,so here we can't have blocking code
    //__dirname is folder where current script located
 */
app.get('/api/v1/tours', (req, res) => {
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
});

app.get('/api/v1/tours/:id', (req, res) => {
  console.log(req.params); //req.params-all the variable/parameter value are stored,:id - this variable in url are called params|| o/p { id: '6' }
  /**  
  find()-pass a callback function,it will loop through the array and in each of the itreation we will access to current element,we will return either true and false in each iteration,find() will create an array only conatin the element when the comparision come out to true
 */
  const idparams = req.params.id * 1; //multiple string that look like a number,multiple with another number,then it automatically convert that string into number
  if (idparams > tours.length) {
    return res.status(404).json({
      status: 'FAIL',
      message: 'Invaild ID .',
    });
  }
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
});

app.post('/api/v1/tours', (req, res) => {
  /**
   * 5>fist thing is to do figure out the id of the new object, in RESTAPI we learn about that we create
   * new object,we never specify the id of object, the database usally take care of it, new object    automatically get its new id, but in this case we don't have database,so what we gonna do is to simply take the id of the last object and then add +1 to that
   */
  const newId = tours[tours.length - 1].id + 1;
  /**  
   6>object.assign()--allow to create object,by merging two existing object together
  */
  const newTours = Object.assign({ id: newId }, req.body);
  tours.push(newTours);
  /**  
   7> we are inside of a callback, thats gonna run in the event loop , so we can't block event loop
   use the writeFile() not the synchronous one....,in this we pass the callback function which gonna processed in backgoround,when its ready its push it event, in one of the event loop queue
   which is then gonna be handled as soon as the event loop passes the phase
   writeFile(file We want to write to,data we want to write(tours)-also need to strigify this object we want json in tours-simple.json file,callbackfunction i.e err)
   */

  fs.writeFile(
    `${__dirname}/dev-data/data/tours-simple.json`,
    JSON.stringify(tours),
    (err) => {
      /** 
         8> what we want to do as soon as the file is written,send the newly created object as response ,
         status(201)-means created
     */
      res.status(201).json({
        status: 'SUCCESS',
        body: {
          tours: newTours,
        },
      });
    }
  );
  //   res.send('DONE');--cant send two responses
});

// /** 1>
//  -post request we can send data from client to server, this data is ideally available on the request,
//  request-obj hold all the data/information about the request that was done,if that some data that was
//  sent ,well that data should be on the request
//  -out of the box express,doen't put that body data on the request,in order to have data available
//  we have to use something called middleware

//  */

// app.post('/api/v1/tours', (req, res) => {
//   /**
//     3> body is the property that is gonna be available on the request,bcz we  use the middleware
//     then  also need to send back a response
//    */
//   res.send('DONE');
//   /**
//    * //4> we always need to send back something in order to finished the request/respose cycle
//    * */
// });

const port = 3000;
app.listen(port, () => {
  console.log(`App start at port : ${port} 🚀🚀🚀`);
});
