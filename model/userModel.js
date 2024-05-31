/* eslint-disable import/no-extraneous-dependencies */
/** user Model */
const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

/**Schema */
const userSchema = new mongoose.Schema(
  //Schema defination
  {
    name: {
      type: String,
      require: [true, 'Please tell us your name !'],
      trim: true,
      lowercase: true,
      unique: true
    },
    email: {
      type: String,
      lowercase: true,
      //   required: [true, "Email can't be blank"],
      /**from validator-package */
      validate: [validator.isEmail, 'Please provide an vaild email']
    },
    /**
     for uplode a photo,but its not require,Photo is mostly optional in web app, 
     if the user want to upload the photo,that will store in somewher in  our file-system , and path to that photo is store into this photo-field
     */
    photo: String,
    role: {
      type: String,
      enum: ['user', 'guide', 'lead-guide', 'admin'],
      default: 'user'
    },

    password: {
      type: String,
      minlength: 8,
      required: [true, 'Please provide a password'],
      select: false //help to prevent data-leak to client(never show in any GET-req-output) eg-password
    },
    passwordConfirm: {
      type: String,
      require: [true, 'Please confirm your password'],
      /**manage password */
      validate: {
        /**
         >>this callback function called when new document created,
         >>this is only gonna work on .save() and .create() -, not with findOneAndUpdate()
        */
        validator: function(el) {
          return el === this.password;
        },
        message: 'Password are not the same'
      }
    },
    /** this property always will change,when someone change the password */
    passwordChangeAt: Date,
    /** passwrod reset  */
    passwordResetToken: String,
    passwordResetExpires: Date, //this reset will actually expire after the certain amt of time as a security measure

    /**for deleting current user */
    active: {
      type: Boolean,
      default: true,
      select: false
    }
  }
);
/**Encryption(mongoose middleware- pre()-save middleware i.e document MW) */
/**
 middleware function that we gonna specify here, so encryption is then gonna be happen b/w the moment that we recivie the data and the moment where its actually persisted to DB
 
 pre-save MW run b/w getting data and saving it to DB
 */
userSchema.pre('save', async function(next) {
  /** 
     only wanted to encrypt the password if the password-field actually been updated,changed and created new

     >>this-refer to current document i.e is current user
     >> isModified('name of field') is method to modified  all document
    */
  //only run this function if the password is modified
  if (!this.isModified('password')) return next();

  //Our password is hashed with bcrypt(this algorithm first salt and then our password in order to make it strong to protect it against brutforce attack),.hash() is async version which return a promise which will be await

  //Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12); //(this.password,cost parameter)

  //Delete the passwordConfirm field (not be persisted in DB)
  this.passwordConfirm = undefined;
  next();
});
/**Reset MiddleWare */
userSchema.pre('save', function(next) {
  /**
   We want to set the passwordChangeAt property ,when we actually modifiy the password property,
   when we create a new Document then we did actually modify the password then we would set the passwordChangeAt-property, 
   this.isNew= when document is new 
   */
  if (!this.isModified('password') || this.isNew) return next();
  //change passwordChangeAt if pass above condition
  this.passwordChangeAt = Date.now() - 1000; //subtracting 1sec bcz saving to database is bit slower than issuing the JWT-token,making it so that change password timestamp is sometime set a bit after the jsonWebToken has been created, that will then make it so that the user will not be able to log in using the new token
  next();
});
/** for delete and not show in ouput */
/** 
 before User.find() qurey in getAllUser executed  this below query-middleware executed (which is only find document which active-proterty in schema is set to true)
 */
userSchema.pre(/^find/, function(next) {
  //this point to current query
  this.find({ active: { $ne: false } });
  next();
});

/**Instance Method(method that available on all the document of a certain collection) 
     
    candidatePassword-password that user pass in the body
    this-keyword point to current document,but this.password is not available bcz in password schema-option we use password {select:false} the password is not available in the output

    candidatePassword - not hash(original password comming from the user)
    userPassword - hashed
*/
userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

/**Instance method to <4> check if user change password if after the JWT/token was issued */
userSchema.methods.changePasswordAfter = function(JWTTimeStamp) {
  if (this.passwordChangeAt) {
    //if the password change property exist only then we want to do the comparision
    const changeTimestamp = parseInt(
      this.passwordChangeAt.getTime() / 1000,
      10
    );
    return JWTTimeStamp < changeTimestamp;
  }
  /**
   bydefault we return false from this method(mean the user has not change his password after the token was issued )
   */
  //false means user not change the password therefore return false
  return false;
};

/**Instance method(mongoose) for Reset Password  */
/**
  the password reset token should basically  be a random string ,but it doesnot need to be crytographically strong as the password hash, we can use the random bytes  function from the built in crypto module
 --> const resetToken = crypto.randomBytes(32).toString('hex');
 - crypto= build in node module
 - .randomBytes(32) => 32 no. of character
 - .toString('hex') = convert to hexdecimal-string  

 - resetToken => this resetToken is what we gonna snd to the user, so it is like a resetPassword that user then can use to create a new real password ,only the user will have acces to this token , it real behave like a password 
 - As it is like a password ,it means that if the hacker can get access to our database,well then thats gonna allow the hacker to gain the access to the account by setting a new passwrod , 
 
 - if we would just simply  store  this resetToken in our database , if some attacker gain access to database ,they could then use that token and create a new password using that token instead of you doing it .just like a password we should not store the plain restToken in DB encrypt it 
 */
// userSchema.methods.createPasswordResetToken = function() {
//   const resetToken = crypto.randomBytes(32).toString('hex');

//   this.passwordResetToken = crypto
//     .createHash('sha256')
//     .update(resetToken)
//     .digest('hex');

//   // console.log(
//   //   'restToken',
//   //   { resetToken },
//   //   'passwordRestToken',
//   //   this.passwordResetToken
//   // );

//   this.passwordResetExpires = Date.now() + 10 * 60 * 1000; //modify it ,not save it
//   //return the plain text token that we gonna send through email
//   return resetToken; // we need to send via email the unencrypted resetToken bcz it would not make much sense to encrypt it, we snd one token via email and then we have encrypted version in our database, and that encrypted one is then basically useless to change the password
// };
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};
/** model */
const User = new mongoose.model('User', userSchema);

module.exports = User;
