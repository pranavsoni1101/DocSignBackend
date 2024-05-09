const express = require('express');
const bodyParser = require('body-parser');
var cors = require('cors')
const fs = require('fs');
const https = require("https");
const dotenv = require ("dotenv");

const connectToDb = require('./db');
const pdfRouter = require("./routes/pdf");
const pdfActionsRouter = require("./routes/pdfActions");
const pfpRouter = require('./routes/pfp');
const authRouter = require("./routes/auth");
const signatureRouter = require("./routes/signature");

const app = express();

dotenv.config({ path: './.env' });

app.use(cors());
// app.use(cors({
//   origin: ["https://scheduleaisandobox.in", "http://localhost:5173", "https://scheduleai.co", "https://divssfdc.com", "http://divssfdc.com", "https://www.divssfdc.com", "http://www.divssfdc.com"],
//   methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
//   credentials: true,
// }));
app.use(bodyParser.json());

// Setting up api routes
app.use('/auth', authRouter);
app.use('/pdf', pdfRouter);
app.use('/pdf', pdfActionsRouter);
app.use('/signature', signatureRouter);
app.use('/pfp', pfpRouter)

// Connect to MongoDB
connectToDb();

const privateKey = fs.readFileSync("/etc/letsencrypt/live/" + process.env.DOMAIN_NAME + "/privkey.pem", "utf8");
const certificate = fs.readFileSync("/etc/letsencrypt/live/" + process.env.DOMAIN_NAME + "/cert.pem", "utf8");
const ca = fs.readFileSync("/etc/letsencrypt/live/" + process.env.DOMAIN_NAME + "/chain.pem", "utf8");

const credentials = {
  key: privateKey,
  cert: certificate,
  ca: ca
}

const https_server = https.createServer(credentials, app);

app.get("/", (req, res) => {
  res.json("HEHEHEHE");
})

const PORT = process.env.PORT || 3001;
https_server.listen(PORT, () => console.log(`https_server is running on port ${PORT}`));


// app.listen(3001, () => {
//   console.log('Server is running on port 3001');
// });
