const mongoose = require("mongoose");

const historySchema = mongoose.Schema({
  transaction_id: {
    type: String,
    unique: true,
    required: true,
  },
  customer_id: {
    type: String,
    unique: true,
    required: true,
  },

  status: {
    type: String,
    required: true,
  },
  items: {
    type: [],
    required: true,
  },
  order_id: {
    type: Date,
    required: true,
  },
});

module.exports = mongoose.model("history", historySchema);
