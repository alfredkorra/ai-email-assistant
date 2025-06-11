const mongoose = require("mongoose");

const UserTokenSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: String,
  picture: String,
  access_token: String,
  refresh_token: String,
  expiry_date: Number,
}, { timestamps: true });

module.exports = mongoose.model("UserToken", UserTokenSchema);
