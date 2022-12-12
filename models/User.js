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
  avatarImage: {
    type: String,
    default: "/images/user.png",
    require: [true, "Please enter avatar image"],
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
