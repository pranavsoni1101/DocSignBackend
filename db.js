const mongoose = require("mongoose");


const connectToDb = () => {
    mongoose.connect("mongodb+srv://pranavsoni:docusigntest@docusignclone.u5m79zz.mongodb.net/?retryWrites=true&w=majority");
    const db = mongoose.connection;
    
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', () => {
      console.log('Connected to MongoDB');
    });
}

module.exports = connectToDb;