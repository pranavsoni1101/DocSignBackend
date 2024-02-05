const express = require('express');
const bodyParser = require('body-parser');

const connectToDb = require('./db');
const authRouter = require("./routes/auth");
const app = express();

app.use(bodyParser.json());
app.use('/auth', authRouter);
// Connect to MongoDB
connectToDb();

app.listen(3001, () => {
  console.log('Server is running on port 3000');
});
