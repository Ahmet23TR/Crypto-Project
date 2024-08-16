const getCryptoPrice = require("./../utils/getCryptoPrice");

exports.convertToCoin = async (req, res) => {
  try {
    const amount = parseFloat(req.query.amount);
    const currency = req.query.currency;
    const coin = req.query.coin;

    if (!amount || isNaN(amount) || !currency || !coin) {
      return res.status(400).json({
        status: "fail",
        message: "Lütfen geçerli bir miktar, para birimi ve coin seçin",
      });
    }

    const jsonData = await getCryptoPrice(coin); // getCryptoPrice fonksiyonunu kullanıyoruz
    const coinPriceInUSDT = parseFloat(jsonData.price);

    let paymentAmountInCoin;
    if (currency.toUpperCase() === "USD") {
      paymentAmountInCoin = amount / coinPriceInUSDT;
    } else if (currency.toUpperCase() === "TL") {
      const usdToTlExchangeRate = 33; // Örnek bir kur
      const amountInUSD = amount / usdToTlExchangeRate;
      paymentAmountInCoin = amountInUSD / coinPriceInUSDT;
    } else {
      return res.status(400).json({
        status: "fail",
        message: "Sadece USD ve TL para birimleri destekleniyor",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        amount,
        currency,
        coin,
        paymentAmountInCoin: paymentAmountInCoin.toFixed(8),
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "fail",
      message: err.message,
    });
  }
};

///////////////// Şimdilik deneme için kullanıldı silinebilir
exports.addPayment = async (req, res) => {
  try {
    const newPayment = await Payment.create(req.body);
    res.status(201).json({
      status: "success",
      data: newPayment,
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};
