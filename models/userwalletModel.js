const mongoose = require("mongoose");

const userWalletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId, // User ID'sini referans alabilir
    ref: "User", // İleride User tablosu ile ilişkilendirilmiş olabilir
    required: true,
  },
  address: {
    type: String,
    required: true,
    unique: true,
  },
  privateKey: {
    type: String,
    required: true,
  },
  currency: {
    type: String,
    required: true,
    enum: ["USD"],
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

const UserWallet = mongoose.model("UserWallet", userWalletSchema);
module.exports = UserWallet;
