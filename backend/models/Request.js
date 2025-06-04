const mongoose = require('mongoose');
const RequestSchema = new mongoose.Schema({
  name: String,
  phone: String,
  amount: String,
  currency: String,
  message: String,
  status: { type: String, default: "Ожидает" }
}, { timestamps: true });

module.exports = mongoose.model('Request', RequestSchema);