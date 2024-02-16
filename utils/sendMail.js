const nodemailer = require("nodemailer");

// A function to send emails
const sendMail = async (from, to, subject, text) => {
    try{
        // Creating a transporter
        let transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
                user: "pranav.soni@kcloudtechnologies.com",
                pass: "uoxu mmnh icfh jktr" // Your Gmail password
            }
        });

        // Defining Mail Options
        let mailOptions = {
            from: from,
            to: to,
            subject: subject,
            text: text
        };

        // Sending Email
        let info = await transporter.sendMail(mailOptions);
        console.log('email sent success', info.response);
    }
    catch(error){
        console.log("error generating mail",error);
    }
};

module.exports = sendMail;