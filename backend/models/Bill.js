const mongoose = require("mongoose");

const billSchema = new mongoose.Schema({
  team:        { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  title:       { type: String, required: true },
  amount:      { type: Number, required: true },
  currency:    { type: String, default: "INR" },
  paidBy:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members:     [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // who splits this bill
  splitAmount: { type: Number }, // amount per person
  category:    { type: String, default: "General" },
  note:        { type: String, default: "" },
  settledBy:   [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  tripId:      { type: mongoose.Schema.Types.ObjectId, default: null }, // links bill to a past/active vacation
}, { timestamps: true });

module.exports = mongoose.model("Bill", billSchema);