const mongoose = require("mongoose");

let Card = mongoose.Schema({
    id: {
        type: String,
        unique: [true, "This card ID is already exist"],
        require: true,
    },
    cardNumber: {
        type: String,
        unique: [true, "This card number is already exist"],
        require: [true, "Please enter card number"]
    },
    expireDate: {
        type: String,
        require: [true, "Please enter card expire date"]
    },

    CVVcode: {
        type: String,
        unique: [true, "This card CVV code is already exist"],
        require: [true, "Please enter card CVV code"]
    },

    desc: {
        type: String,

    },

});

module.exports = mongoose.model("Card", Card);