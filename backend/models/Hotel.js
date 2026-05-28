const mongoose = require("mongoose");

const hotelSchema = new mongoose.Schema({
  team:        { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  tripId:      { type: mongoose.Schema.Types.ObjectId, default: null },
  addedBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name:        { type: String, required: true },
  destination: { type: String, required: true },
  address:     { type: String, default: "" },
  checkIn:     { type: Date, required: true },
  checkOut:    { type: Date, required: true },
  pricePerNight: { type: Number, required: true },
  currency:    { type: String, default: "INR" },
  rooms:       { type: Number, default: 1 },
  totalPrice:  { type: Number },
  notes:       { type: String, default: "" },
  status:      { type: String, enum: ["planned", "confirmed", "cancelled"], default: "planned" },
  bookedMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

module.exports = mongoose.model("Hotel", hotelSchema);