const express = require('express');
const bodyParser = require('body-parser');
var cors = require('cors')

const connectToDb = require('./db');
const authRouter = require("./routes/auth");
const pdfRouter = require("./routes/pdf");

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Setting up api routes
app.use('/auth', authRouter);
app.use('/pdf', pdfRouter);

// Connect to MongoDB
connectToDb();

app.listen(3001, () => {
  console.log('Server is running on port 3001');
});
