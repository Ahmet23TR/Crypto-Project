const axios = require("axios");

async function getCryptoPrice(coin) {
  try {
    const response = await axios.get(
      `https://api.binance.com/api/v3/ticker/price?symbol=${coin}`
    );
    return response.data; // Binance API'den gelen veriyi direkt döndürüyoruz
  } catch (error) {
    throw new Error("API isteği sırasında bir hata oluştu");
  }
}

module.exports = getCryptoPrice;
