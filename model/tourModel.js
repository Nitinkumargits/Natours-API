const mongoose = require('mongoose');
/** MongoDB schema  */

const toursSchema = new mongoose.Schema({
  name: {
    type: String,
    require: [true, 'A tour must have name'],
    unique: true
  },
  rating: {
    type: Number,
    default: 4.5
  },
  price: {
    type: Number,
    reuqire: [true, 'A tour must have price']
  }
});
/** mongoDB Model */

const Tour = new mongoose.model('Tour', toursSchema);

module.exports = Tour;
