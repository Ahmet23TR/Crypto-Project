const Web3 = require("web3").default;
const Wallet = require("./../models/walletModel");
const UserWallet = require("./../models/userwalletModel");
const Transaction = require("./../models/transactionModel");
const getCryptoPrice = require("./../utils/getCryptoPrice");

const web3 = new Web3("https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID");

exports.getOrCreateWallet = async (req, res) => {
  try {
    const { network } = req.query;

    if (!network || !["BTC", "ETH"].includes(network)) {
      return res.status(400).json({
        status: "fail",
        message: "Geçerli bir ağ (BTC veya ETH) seçilmelidir.",
      });
    }

    // Müsait bir cüzdan bulmaya çalışıyoruz
    const availableWallet = await Wallet.findOne({
      network: "BTC",
      isOccupied: false,
      occupiedUntil: { $lt: new Date() }, // occupiedUntil süresi geçmiş cüzdanlar
    });

    if (availableWallet) {
      // Müsait cüzdan bulunduysa, onu kullanıyoruz
      availableWallet.isOccupied = true;
      availableWallet.occupiedUntil = new Date(Date.now() + 1 * 60 * 1000); // 1 dakika boyunca kullanılacak
      await availableWallet.save();

      await availableWallet.save();

      console.log(
        "Cüzdanın güncellenmiş occupiedUntil süresi:",
        availableWallet.occupiedUntil
      );
      console.log(
        "Cüzdanın güncellenmiş isOccupied durumu:",
        availableWallet.isOccupied
      );

      return res.status(200).json({
        status: "success",
        data: {
          walletAddress: availableWallet.address,
          privateKey: availableWallet.privateKey,
          network: availableWallet.network,
        },
      });
    } else {
      // Eğer müsait cüzdan yoksa yeni bir cüzdan oluşturuyoruz
      const newAccount = web3.eth.accounts.create();
      const newWallet = await Wallet.create({
        address: newAccount.address,
        privateKey: newAccount.privateKey,
        network,
        isOccupied: true,
        occupiedUntil: new Date(Date.now() + 1 * 60 * 1000), // 1 dakika boyunca kullanılacak
      });

      return res.status(201).json({
        status: "success",
        data: {
          walletAddress: newWallet.address,
          privateKey: newWallet.privateKey,
          network: newWallet.network,
        },
      });
    }
  } catch (err) {
    console.error("Hata:", err.message);
    return res.status(500).json({
      status: "fail",
      message: err.message,
    });
  }
};

exports.createUserWallet = async (req, res) => {
  try {
    const { userId, balance } = req.body;

    if (!userId || balance === undefined) {
      return res.status(400).json({
        status: "fail",
        message: "userId ve balance alanları gereklidir",
      });
    }

    const newAccount = web3.eth.accounts.create();
    const newWallet = await UserWallet.create({
      userId, // Kullanıcı ID'sini burada ekliyoruz
      address: newAccount.address,
      privateKey: newAccount.privateKey,
      currency: "USD",
      balance: balance, // Postman'den belirlenen bakiye
    });

    return res.status(201).json({
      status: "success",
      data: {
        userId: newWallet.userId,
        walletAddress: newWallet.address,
        privateKey: newWallet.privateKey,
        currency: newWallet.currency,
        balance: newWallet.balance,
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: "fail",
      message: err.message,
    });
  }
};

exports.processPayment = async (req, res) => {
  try {
    const { userId, amount, currency, coin } = req.body;

    // Kullanıcının cüzdanını bul
    const userWallet = await UserWallet.findOne({ userId });

    if (!userWallet) {
      return res.status(404).json({
        status: "fail",
        message: "Kullanıcı cüzdanı bulunamadı",
      });
    }

    // Bakiyeyi kontrol et
    if (userWallet.balance < amount) {
      return res.status(400).json({
        status: "fail",
        message: "Yetersiz bakiye",
      });
    }

    // BTC miktarını hesapla
    const jsonData = await httpsGet(
      `https://api.binance.com/api/v3/ticker/price?symbol=${coin}`
    );
    const coinPriceInUSDT = parseFloat(jsonData.price);

    let paymentAmountInCoin;
    if (currency.toUpperCase() === "USD") {
      paymentAmountInCoin = amount / coinPriceInUSDT;
    } else {
      return res.status(400).json({
        status: "fail",
        message: "Sadece USD destekleniyor",
      });
    }

    // Kullanıcının bakiyesini düşür
    userWallet.balance -= amount;
    await userWallet.save();

    // İşlemi kaydet
    const transaction = {
      userId,
      coin,
      amount,
      paymentAmountInCoin: paymentAmountInCoin.toFixed(8),
      transactionDate: new Date(),
    };

    // Burada işlemi veritabanında bir Transaction modeline kaydedebilirsin
    // await Transaction.create(transaction);

    return res.status(200).json({
      status: "success",
      data: {
        transaction,
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: "fail",
      message: err.message,
    });
  }
};

exports.processPaymentToWallet = async (req, res) => {
  try {
    const { userId, amount, currency, coin } = req.body;

    // Kullanıcının cüzdanını bul
    const userWallet = await UserWallet.findOne({ userId });

    if (!userWallet) {
      return res.status(404).json({
        status: "fail",
        message: "Kullanıcı cüzdanı bulunamadı",
      });
    }

    if (userWallet.balance < amount) {
      return res.status(400).json({
        status: "fail",
        message: "Yetersiz bakiye",
      });
    }

    // Müsait cüzdanı bul veya yeni bir cüzdan oluştur
    let targetWallet = await Wallet.findOne({
      isOccupied: false,
      occupiedUntil: { $lt: new Date() },
      network: coin.startsWith("BTC") ? "BTC" : "ETH",
    });

    if (!targetWallet) {
      const newAccount = web3.eth.accounts.create();
      targetWallet = await Wallet.create({
        address: newAccount.address,
        privateKey: newAccount.privateKey,
        network: coin.startsWith("BTC") ? "BTC" : "ETH",
        isOccupied: true,
        occupiedUntil: new Date(Date.now() + 1 * 60 * 1000),
        balance: 0,
      });
    }

    // Axios kullanarak BTC miktarını hesapla
    const jsonData = await getCryptoPrice(coin);
    const coinPriceInUSDT = parseFloat(jsonData.price);
    const paymentAmountInCoin = amount / coinPriceInUSDT;

    // Cüzdanın bakiyesine ekle ve occupied değerini güncelle
    targetWallet.balance = (targetWallet.balance || 0) + paymentAmountInCoin;
    targetWallet.isOccupied = true;
    targetWallet.occupiedUntil = new Date(Date.now() + 1 * 60 * 1000); // 1 dakika boyunca rezerve edilecek

    // Cüzdanı kaydet ve güncellemenin başarılı olup olmadığını kontrol et
    await targetWallet.save();
    console.log("Cüzdan başarıyla güncellendi:", targetWallet);

    // Kullanıcı bakiyesini güncelle
    userWallet.balance -= amount;
    await userWallet.save();
    console.log("Kullanıcı bakiyesi güncellendi:", userWallet);

    // İşlemi kaydet
    const transaction = await Transaction.create({
      userId: userWallet.userId,
      userAddress: userWallet.address,
      coin: coin,
      amountInCoin: paymentAmountInCoin.toFixed(8),
      amountInUSD: amount,
      transactionTime: new Date(),
      targetWalletAddress: targetWallet.address,
      targetWalletPrivateKey: targetWallet.privateKey,
    });

    return res.status(200).json({
      status: "success",
      data: {
        transaction,
      },
    });
  } catch (err) {
    console.error("Cüzdan güncellenirken hata:", err.message);
    return res.status(500).json({
      status: "fail",
      message: err.message,
    });
  }
};

exports.getWalletByAddress = async (req, res) => {
  try {
    const { targetWalletAddress } = req.params;

    // Verilen adrese göre cüzdanı bul
    const wallet = await Wallet.findOne({ address: targetWalletAddress });

    if (!wallet) {
      return res.status(404).json({
        status: "fail",
        message: "Cüzdan bulunamadı",
      });
    }

    return res.status(200).json({
      status: "success",
      data: wallet,
    });
  } catch (err) {
    return res.status(500).json({
      status: "fail",
      message: err.message,
    });
  }
};

exports.processFullPayment = async (req, res) => {
  try {
    const { userId, amount, currency, coin } = req.body;
    const targetWallet = req.targetWallet; // Önceki middleware'den gelen cüzdan

    // Coin fiyatını al
    const jsonData = await getCryptoPrice(coin);
    const coinPriceInUSDT = parseFloat(jsonData.price);

    // Ödenecek coin miktarını hesapla
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

    // Kullanıcı cüzdanını bul ve bakiye kontrolü yap
    const userWallet = await UserWallet.findOne({ userId });
    if (!userWallet) {
      return res.status(404).json({
        status: "fail",
        message: "Kullanıcı cüzdanı bulunamadı",
      });
    }

    if (userWallet.balance < amount) {
      return res.status(400).json({
        status: "fail",
        message: "Yetersiz bakiye",
      });
    }

    // Ödemeyi gerçekleştir ve cüzdan bakiyelerini güncelle
    userWallet.balance -= amount;
    targetWallet.balance = (targetWallet.balance || 0) + paymentAmountInCoin;

    // Cüzdanı ve kullanıcı bakiyesini kaydet
    await userWallet.save();
    await targetWallet.save();
    console.log("Cüzdan ve kullanıcı güncellendi:", {
      targetWallet,
      userWallet,
    });

    // İşlemi kaydet
    const transaction = await Transaction.create({
      userId: userWallet.userId,
      userAddress: userWallet.address,
      coin: coin,
      amountInCoin: paymentAmountInCoin.toFixed(8),
      amountInUSD: amount,
      transactionTime: new Date(),
      targetWalletAddress: targetWallet.address,
      targetWalletPrivateKey: targetWallet.privateKey,
    });

    // Başarılı yanıt gönder
    return res.status(200).json({
      status: "success",
      data: {
        transaction,
      },
    });
  } catch (err) {
    console.error("Hata:", err.message);
    return res.status(500).json({
      status: "fail",
      message: err.message,
    });
  }
};

exports.checkAndCreateWallet = async (req, res, next) => {
  try {
    const { coin } = req.body;

    // Süresi geçmiş cüzdanları otomatik olarak güncelle
    await Wallet.updateMany(
      { isOccupied: true, occupiedUntil: { $lt: new Date() } },
      { $set: { isOccupied: false } }
    );

    // Müsait cüzdanı bul veya yeni bir cüzdan oluştur
    let targetWallet = await Wallet.findOne({
      isOccupied: false,
      network: coin.startsWith("BTC") ? "BTC" : "ETH",
    });

    if (!targetWallet) {
      // Eğer mevcut müsait cüzdan yoksa yeni bir cüzdan oluştur
      const newAccount = web3.eth.accounts.create();
      targetWallet = await Wallet.create({
        address: newAccount.address,
        privateKey: newAccount.privateKey,
        network: coin.startsWith("BTC") ? "BTC" : "ETH",
        isOccupied: true,
        occupiedUntil: new Date(Date.now() + 1 * 60 * 1000), // 1 dakika boyunca kullanılacak
        balance: 0,
      });
    } else {
      // Mevcut müsait cüzdanı kullan ve durumu güncelle
      targetWallet.isOccupied = true;
      targetWallet.occupiedUntil = new Date(Date.now() + 1 * 60 * 1000); // 1 dakika boyunca rezerve edilecek
      await targetWallet.save();
    }

    // `req` objesine `targetWallet`'ı ekleyelim ki sonraki middleware'de kullanabilelim
    req.targetWallet = targetWallet;
    next(); // Sonraki middleware'e geç
  } catch (err) {
    return res.status(500).json({
      status: "fail",
      message: err.message,
    });
  }
};

exports.getUserWallet = async (req, res) => {
  try {
    const { userId } = req.query;

    const userWallet = await UserWallet.findOne({ userId });

    if (!userWallet) {
      return res.status(404).json({
        status: "fail",
        message: "Kullanıcı cüzdanı bulunamadı",
      });
    }

    return res.status(200).json({
      status: "success",
      data: userWallet,
    });
  } catch (err) {
    return res.status(500).json({
      status: "fail",
      message: err.message,
    });
  }
};
