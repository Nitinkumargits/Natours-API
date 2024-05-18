const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' }); //this command will do read our variable from the file and save them in nodejs enviroment variable

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

app.listen(port, () => {
  console.log(`App start at port : ${port} 🚀🚀🚀`);
});
