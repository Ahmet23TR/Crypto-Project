const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true,
  },
  privateKey: {
    type: String,
    required: true,
  },
  network: {
    type: String,
    required: true,
    enum: ["BTC", "ETH"],
  },
  isOccupied: {
    type: Boolean,
    default: false,
  },
  occupiedUntil: {
    type: Date,
  },
  balance: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Wallet = mongoose.model("Wallet", walletSchema);
module.exports = Wallet;
