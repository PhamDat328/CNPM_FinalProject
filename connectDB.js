const mongoose = require("mongoose");

async function connect() {
  try {
    await mongoose.connect(
      "mongodb+srv://PhamNguyenPhatDat:abcxyz123456@cluster0.3shqxci.mongodb.net/Computershop?retryWrites=true&w=majority",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("Connect database successfully");
  } catch (error) {
    console.log("Connect database failure");
  }
}

module.exports = { connect };
