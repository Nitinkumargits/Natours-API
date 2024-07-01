const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
// const Tour = require('./../../model/tourModel');
// const Review = require('./../../model/reviewModel');
const User = require('./../../model/userModel');

dotenv.config({ path: './config.env' });

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
    useFindAndModify: false
  })
  .then(() =>
    console.log('DB connection succesfull  for import JSON :💽💾💾💾')
  );

//Read JSON file
// const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));

// const reviews = JSON.parse(
//   fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8')
// );

const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));

//import data into DataBase
const importData = async () => {
  try {
    //Tour.create()-> previouly we pass object back then, create method can also accept an array of objects it will simply create new document for each of the object in the array
    // await Tour.create(tours);
    await User.create(users);
    // await Review.create(reviews);
    console.log('Data is successfully loaded');
  } catch (error) {
    console.log(error);
  }
  process.exit();
};

//Delete all the data from the collection
const deleteData = async () => {
  try {
    // await Tour.deleteMany();
    await User.deleteMany();
    // await Review.deleteMany();
    console.log('Data is successfully Deleted');
  } catch (error) {
    // console.log(error);
    console.log('error in deletion');
  }
  process.exit();
};

//interacting with command line
// console.log(process.argv);
/** 
 * in command line
 input::::
 node ./dev-data\data\import-dev-data.js --import
 
 output::::
  [
  'C:\\Program Files\\nodejs\\node.exe',
  'D:\\2.1. Node\\NODE-APP\\Natours-API\\dev-data\\data\\import-dev-data.js', 
  '--import'
]
 */

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}
