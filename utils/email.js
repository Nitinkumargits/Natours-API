/* eslint-disable lines-between-class-members */
const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

// import { htmlToText } from 'html-to-text';

/**
 how to use it :-// new Email(user, url).sendWelcome();

 -whenever we want to snd the new email is to import this email-class => 
  new Email(pass user contain email-address and name in case you want to personalized the email , An url eg: resetURL for resetting the password ).method we want to call that actually going to snd the email  
 
 */

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Nitin kumar <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // Sendgrid
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
    }

    return nodemailer.createTransport({
      service: 'gmail',
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
      // Activate "less secure app" option in case of gmail
    });
  }

  // send the actual email (recevie a template and Subject)
  async send(template, subject) {
    // 1) Render HTML based on a pug template(take file n render the pug code in html )
    // ${__dirname}= location of the currently running script
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      //wnt to actually do or email personalization with name and url
      firstName: this.firstName,
      url: this.url,
      subject: subject
    });

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: subject,
      html: html,
      text: htmlToText.compile(html) // include the text-version of our email into email,better for email delivery rates and also for spam folders, some people pefer plain text emails instead having the more formatted HTML emails,(we need a way to convert  all the HTML to simple text, stripping out all of the HTML  leaving  only the content package => npm i html-to-text)
    };

    // 3) Create a transport and send email
    // await transporter.sendMail(mailOptions); // returns promise
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Natours Family!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token(valid for only 10 minutes)'
    );
  }
};

// const sendEmail = async (options) => {
//   // 1) Create a transporter(a service which sends email)

//   // 2) Define the email options

//   // 3) Actually send the email
//   await transporter.sendMail(mailOptions); // returns promise
// };
