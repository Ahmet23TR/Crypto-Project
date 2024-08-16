const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId, // Bu alan ObjectId olarak kalabilir
    ref: "UserWallet",
    required: true,
  },
  userAddress: {
    type: String,
    required: true,
  },
  coin: {
    type: String,
    required: true,
  },
  amountInCoin: {
    type: Number,
    required: true,
  },
  amountInUSD: {
    type: Number,
    required: true,
  },
  transactionTime: {
    type: Date,
    default: Date.now,
  },
  targetWalletAddress: {
    type: String, // Bunu ObjectId'den String'e değiştirin
    required: true,
  },
  targetWalletPrivateKey: {
    type: String,
    required: true,
  },
});

const Transaction = mongoose.model("Transaction", transactionSchema);
module.exports = Transaction;
