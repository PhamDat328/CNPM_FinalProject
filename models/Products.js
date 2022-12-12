const mongoose = require("mongoose");

const Product = mongoose.Schema({
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
  product_detail: {},
});

module.exports = mongoose.model("Product", Product);
