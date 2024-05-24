/* eslint-disable import/no-extraneous-dependencies */
/** user Model */

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
    passwordChangeAt: Date
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
/** model */
const User = new mongoose.model('User', userSchema);

module.exports = User;
