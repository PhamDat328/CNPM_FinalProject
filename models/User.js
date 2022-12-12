const mongoose = require("mongoose");

let User = mongoose.Schema({
  username: {
    type: String,
    unique: [true, "This user name is already exist"],
    require: true,
  },
  fullName: {
    type: String,
  },
  dateOfBirth: Date,
  phoneNumber: String,
  email: {
    type: String,
    require: [true, "Please enter your email"],
    unique: [true, "This email is already exist"],
  },
  address: String,
  avatar: {
    type: String,
    default: "/images/user.png",
  },

  backIdImage: {
    type: String,
    require: [true, "Please enter back id image"],
  },
  fontIdImage: {
    type: String,
    require: [true, "Please enter font id image"],
  },
  admin: {
    type: Boolean,
    default: false,
    select: false,
  },
  cart: {
    type: [],
  },

  createAt: {
    type: Date,
    require: true,
  },
});

module.exports = mongoose.model("User", User);
