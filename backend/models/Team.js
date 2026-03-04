const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  code: { type: String, required: true, unique: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      joinedAt: { type: Date, default: Date.now }
    }
  ],
  pendingInvites: [{ type: String }],
  isLocked: { type: Boolean, default: false }, // when true, no one can join
  vacation: {
    active: { type: Boolean, default: false },
    destination: { type: String, default: "" },
    startedAt: { type: Date }
  }
}, { timestamps: true });

module.exports = mongoose.model("Team", teamSchema);
