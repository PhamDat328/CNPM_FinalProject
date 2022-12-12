const mongoose = require("mongoose");
const Product = require("../models/Products");

const categorySchema = mongoose.Schema({
  category_id: {
    type: String,
    unique: true,
    required: true,
  },
  items: {
    type: [Product],
  },
  category_name: {
    type: String,
    unique: true,
    required: true,
  },
});

module.exports = mongoose.model("category", categorySchema);
