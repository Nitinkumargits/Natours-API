class APIFeatures {
  //constructor(mongooseQuery,QueryString that we get from the express(comming from the route))
  constructor(query, queryStr) {
    this.query = query;
    this.queryStr = queryStr;
  }
  //req.query>>>>replace>>>>>this.queryStr
  //query>>>>>>>replace>>>this.query

  //Method for each of the functionality

  filter() {
    //Build the query
    //1A>---filtering
    const queryObj = { ...this.queryStr };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    //1B>---Adavanced filtering
    //convert object to string
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lt|lte)\b/g, match => `$${match}`);

    // let query = Tour.find(JSON.parse(queryStr));
    this.query = this.query.find(JSON.parse(queryStr));

    return this; //too chain the method bcz(this is simply the entire object)
  }

  sort() {
    if (this.queryStr.sort) {
      const sortBy = this.queryStr.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
      //sort(price ratingsAverage)
    } else {
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  limitFields() {
    if (this.queryStr.fields) {
      const fields = this.queryStr.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
      //minus means not including,but exlcluding here (not about acceding and descending)
    }

    return this;
  }

  paginate() {
    const page = this.queryStr.page * 1 || 1; //query || pageNumber=1
    const limit = this.queryStr.limit * 1 || 100; //query || limit=100 documents
    const skip = (page - 1) * limit; //all the result that come before the page that we will request

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
