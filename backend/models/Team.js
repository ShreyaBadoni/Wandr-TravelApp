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
  isLocked: { type: Boolean, default: false },
  vacation: {
    active:      { type: Boolean, default: false },
    destination: { type: String, default: "" },
    startedAt:   { type: Date },
    tripId:      { type: mongoose.Schema.Types.ObjectId }
  },
  pastVacations: [
    {
      destination: { type: String },
      startedAt:   { type: Date },
      endedAt:     { type: Date },
      members:     [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("Team", teamSchema);