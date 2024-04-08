const dotenv = require('dotenv');

dotenv.config({ path: './config.env' }); //this command will do read our variable from the file and save them in nodejs enviroment variable

const app = require('./app');
/**-----------Start Server------------------------------*/
const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`App start at port : ${port} 🚀🚀🚀`);
});
