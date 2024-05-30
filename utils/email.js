const nodemailer = require('nodemailer');

const sendEmail = async options => {
  // 1> Create a transporter
  /**
   transporter is basically a service that will actually send email
    (node js not snd email itself)
  */
  const transporter = nodemailer.createTransport({
    // service: 'Gmail',
    //activate in Gmail "less secure app "option
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  });
  // 2> Define Email options

  const mailOptions = {
    from: 'nitin Kumar <nitin@gmail.com>',
    to: options.email, //recipients address
    subject: options.subject,
    text: options.message //text version of email,
    //also specifiy HTML-property
    //html:
  };

  // 3> Actually send the Email with nodemailer
  await transporter.sendMail(mailOptions); //return a promise
};

module.exports = sendEmail;
/**
 In your Gmail account you actually have to activate "less secure app "option
 -Reason why we not using Gmail in this application , Gmail is not a good idea for a production app (you can only snd 500 email per day , You will marked as spammer),

 - unless its private app , and you want to snd email to your self(10 friend ) ,
 you should use sendGrid and Mailgun
 
 - for this project we use special development service which basically fakes to send email to real address(but reality these email end up trapped in a development inbox so that we can have look at how they will look in production i.e mailtrap.io-> you can fake to send email to client,but these email will never reach these client and instead trapped in your 
    mailTrap(https://mailtrap.io/inboxes))
 */
