const mongoose = require("mongoose");

const paymentSchema = mongoose.Schema({
  product_id: {
    type: String,
    unique: true,
    required: true,
  },
  category_id: {
    type: String,
    unique: true,
    required: true,
  },

  product_name: {
    type: String,
    unique: true,
    required: true,
  },

  product_price: {
    type: Number,
    unique: true,
    required: true,
  },
  product_images: {
    type: [],
    required: true,
  },
  product_images: {
    type: {
      cpu: String,
      ram: String,
      hardDisk: String,
      VGA: String,
      monitor: String,
      port: String,
      opticalDrive: String,
      audio: String,
      keyboard: String,
      memoryReader: String,
      LAN: String,
      WIFI: String,
      Bluetooth: String,
      Webcam: String,
      OS: String,
      pin: String,
      weight: String,
      color: String,
      size: String,
    },
  },
});

module.exports = mongoose.model("payment", paymentSchema);
