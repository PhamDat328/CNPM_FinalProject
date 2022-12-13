const mongoose = require("mongoose");

const ordersSchema = mongoose.Schema({
  order_id: {
    type: String,
    unique: true,
    required: true,
  },
  customer_id: String,

  items: {
    type: [],
    required: true,
  },
  orderDate: {
    type: String,
    required: true,
  },
  totalsPrice: {
    type: String,
    required: true,
  },
  paymentMethods: String,
  shippingAddress: {
    type: {
      customer_name: String,
      customer_email: String,
      customer_phone: String,
      address: String,
    },
    required: true,
  },
});

module.exports = mongoose.model("order", ordersSchema);
