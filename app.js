const express = require('express');
const bodyParser = require('body-parser');
var cors = require('cors');
const cookieParser = require('cookie-parser');

const connectToDb = require('./db');
const pdfRouter = require("./routes/pdf");
const pdfActionsRouter = require("./routes/pdfActions");
const pfpRouter = require('./routes/pfp');
const authRouter = require("./routes/auth");
const signatureRouter = require("./routes/signature");

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());

// Setting up api routes
app.use('/auth', authRouter);
app.use('/pdf', pdfRouter);
app.use('/pdf', pdfActionsRouter);
app.use('/signature', signatureRouter);
app.use('/pfp', pfpRouter)

// Connect to MongoDB
connectToDb();

app.listen(3001, () => {
  console.log('Server is running on port 3001');
});
