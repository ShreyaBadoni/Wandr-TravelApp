const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name:              { type: String, required: true },
  email:             { type: String, required: true, unique: true },
  password:          { type: String, required: true },
  avatar:            { type: String, default: "" },
  bio:               { type: String, default: "" },
  location:          { type: String, default: "" },
  resetToken:        { type: String, default: null },
  resetTokenExpiry:  { type: Date,   default: null },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);