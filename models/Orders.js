const mongoose = require("mongoose");

const ordersSchema = mongoose.Schema({
  order_id: {
    type: String,
    unique: true,
    required: true,
  },
  customer_id: {
    type: String,
    unique: true,
    required: true,
  },

  items: {
    type: [],
    required: true,
  },
  orderDate: {
    type: Date,
    required: true,
  },
  totalsPrice: {
    type: Number,
    required: true,
  },
  shippingAddress: {
    type: {
      customer_name: String,
      customer_email: String,
      customer_phone: String,
      address: String,
      paymentMethods: String,
    },
    required: true,
  },
});

module.exports = mongoose.model("order", ordersSchema);
