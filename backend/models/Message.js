const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  team:    { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  sender:  { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // null = AI
  content: { type: String, required: true },
  isAI:    { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);