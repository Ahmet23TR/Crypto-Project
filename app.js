const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config({ path: "./config.env" });

const paymentRouter = require("./paymentRouter");

const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {})
  .then(() => console.log("MongoDB bağlantısı başarılı!"))
  .catch((err) => console.error("MongoDB bağlantısı başarısız:", err));

app.use("/api", paymentRouter);

app.listen(port, () => {
  console.log(`Sunucu ${port} portunda çalışıyor.`);
});
