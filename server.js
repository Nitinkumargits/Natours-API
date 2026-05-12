const mongoose = require('mongoose');
const dotenv = require('dotenv');

/**Catching uncaught Exception(top of code ) */
process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception shutting down ....');
  console.log(err.name, err.message);
  //we really need to crach our application,because after there was an uncaught expection the entire node process is so called un-clean state
  process.exit(1);
});

dotenv.config({ path: './prod.env' }); //this command will do read our variable from the file and save them in nodejs enviroment variable

const app = require('./app');

/**MongoDB */
/** connection string for mongoose i.e DB */
const DB = process.env.DATABASE;

const port = process.env.PORT || 3000;
let server;

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
    authSource: 'admin',
    replicaSet: 'atlas-qa10n3-shard-0',
    ssl: true,
  })
  .then(() => {
    console.log('DB connection succesfull :💽💾💾💾');
    server = app.listen(port, '0.0.0.0', () => {
      console.log(`App start at port : ${port} 🚀🚀🚀`);
    });
  })
  .catch((err) => {
    console.log('DB connection error:', err.message);
    process.exit(1);
  });

/** Globally handle Unhandle rejected promises */
/**
 Each time that there is unhandle rejection somewhere in our application,the process-obj  will emit an object called unhandle rejection,so that we can subscribe to that event
 */
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message); //MongoError bad auth :
  console.log('Unhandle Rejection 😥😥😥,Shuting down application');

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
