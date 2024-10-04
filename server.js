const mongoose = require('mongoose');
const dotenv = require('dotenv');

/**Catching uncaught Exception(top of code ) */
process.on('uncaughtException', err => {
  console.log('Uncaught Exception shutting down ....');
  console.log(err.name, err.message);
  //we really need to crach our application,because after there was an uncaught expection the entire node process is so called un-clean state
  process.exit(1);
});

dotenv.config(); //this command will do read our variable from the file and save them in nodejs enviroment variable

const app = require('./app');

/**MongoDB */
/** connection string for mongoose i.e DB */
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

/** mongoose.connect() is return a promise so we have to hanndle the promise using then() which have access to connection object which is con,con is the resolve value of promise*/
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(() => console.log('DB connection succesfull :💽💾💾💾'));

/**------StartServer------------------------------*/
const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`App start at port : ${port} 🚀🚀🚀`);
});

/** Globally handle Unhandle rejected promises */
/**
 Each time that there is unhandle rejection somewhere in our application,the process-obj  will emit an object called unhandle rejection,so that we can subscribe to that event
 */
process.on('unhandledRejection', err => {
  console.log(err.name, err.message); //MongoError bad auth : authentication failed
  /**if you have Promblem with DB so just exit the programm/shutDown the application */
  /**
   code zero stands for success
   one stands for uncaught exceptions
   */
  console.log('Unhandle Rejection 😥😥😥,Shuting down application');
  /**
    server.close() we giving server,time to finish all request that are still pending or begin handle all the time,aft that the server basically closed
   */
  server.close(() => {
    process.exit(1);
  });
});

// console.log(x); //x is undefined
// SIGTERM--> A signal that stops the program from running
process.on('SIGTERM', () => {
  console.log('👋zz SIGTERM RECEIVED, shutting down gracefully');
  //close the server but before that still handle all the pending request,not close application abrupt
  server.close(() => {
    console.log('💥 process terminated');
  });
});
