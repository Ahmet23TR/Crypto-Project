const express = require("express");
const paymentController = require("./controllers/paymentController");
const walletController = require("./controllers/walletController");
const getCryptoPrice = require("./utils/getCryptoPrice");

const router = express.Router();

router.post("/add-payment", paymentController.addPayment);

router.get("/calculate-payment", paymentController.convertToCoin);
router.get("/get-crypto-price", getCryptoPrice);
router.get("/get-wallet", walletController.getOrCreateWallet);
router.post("/create-user-wallet", walletController.createUserWallet);
router.post("/process-payment", walletController.processPayment);
router.post(
  "/process-payment-to-wallet",
  walletController.processPaymentToWallet
);
router.get("/wallet/:targetWalletAddress", walletController.getWalletByAddress);
router.post(
  "/process-full-payment",
  walletController.checkAndCreateWallet,
  walletController.processFullPayment
);
router.get("/get-user-wallet", walletController.getUserWallet);

module.exports = router;
