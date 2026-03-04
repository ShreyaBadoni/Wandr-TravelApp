const express = require("express");
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const app = express();
const User = require("./models/User");
const Team = require("./models/Team");
const jwt = require("jsonwebtoken");
const authMiddleware = require("./middleware/auth");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("mongodb connected"))
  .catch(err => console.log(err));

// ── Email transporter ──────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS   // Gmail App Password
  }
});

// ── Helper: generate unique 6-char team code ──────────────────
function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ── AUTH ROUTES ───────────────────────────────────────────────

app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.status(200).json({ message: "Login successful", token, user: { name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ name: user.name, email: user.email });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ message: "Name and email are required" });
    const existing = await User.findOne({ email });
    if (existing && existing._id.toString() !== req.user.id) {
      return res.status(400).json({ message: "Email already in use" });
    }
    const updatedUser = await User.findByIdAndUpdate(req.user.id, { name, email }, { new: true }).select("-password");
    if (!updatedUser) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Profile updated", name: updatedUser.name, email: updatedUser.email });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── TEAM ROUTES ───────────────────────────────────────────────

// Create a team
app.post("/teams", authMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: "Team name is required" });

    // Generate unique code
    let code;
    let exists = true;
    while (exists) {
      code = generateCode();
      exists = await Team.findOne({ code });
    }

    const team = new Team({
      name,
      description: description || "",
      code,
      owner: req.user.id,
      members: [{ user: req.user.id }]
    });

    await team.save();
    const populated = await Team.findById(team._id)
      .populate("owner", "name email")
      .populate("members.user", "name email");

    res.status(201).json({ message: "Team created", team: populated });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get my teams (teams I own or am a member of)
app.get("/teams", authMiddleware, async (req, res) => {
  try {
    const teams = await Team.find({
      $or: [
        { owner: req.user.id },
        { "members.user": req.user.id }
      ]
    })
      .populate("owner", "name email")
      .populate("members.user", "name email");

    res.json({ teams });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Join a team via code  ← must be before /teams/:id to avoid wildcard conflict
app.post("/teams/join", authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "Team code is required" });

    const team = await Team.findOne({ code: code.toUpperCase() });
    if (!team) return res.status(404).json({ message: "Invalid team code" });

    if (team.isLocked) return res.status(403).json({ message: "This team has closed registration" });

    const alreadyMember = team.members.some(m => m.user.toString() === req.user.id);
    if (alreadyMember) return res.status(400).json({ message: "You are already in this team" });

    team.members.push({ user: req.user.id });

    // Remove from pending invites if they were invited
    const userEmail = req.user.email;
    team.pendingInvites = team.pendingInvites.filter(e => e !== userEmail);

    await team.save();

    const populated = await Team.findById(team._id)
      .populate("owner", "name email")
      .populate("members.user", "name email");

    res.json({ message: `Joined team "${team.name}"!`, team: populated });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── These specific routes must all come before /teams/:id ─────

// Accept invite via email link (no login required)
app.get("/teams/invite/accept", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send(invitePage("Invalid Link", "❌", "This invite link is missing or invalid.", "#e05c5c"));
    let decoded;
    try { decoded = jwt.verify(token, process.env.JWT_SECRET); }
    catch { return res.status(400).send(invitePage("Link Expired", "⏰", "This invite link has expired. Ask the team leader to send a new invite.", "#d4a853")); }
    const { teamId, email } = decoded;
    const team = await Team.findById(teamId).populate("owner", "name");
    if (!team) return res.status(404).send(invitePage("Team Not Found", "🧭", "This team no longer exists.", "#e05c5c"));
    team.pendingInvites = team.pendingInvites.filter(e => e !== email);
    const user = await User.findOne({ email });
    if (!user) {
      await team.save();
      return res.send(invitePage("Almost There!", "🌍", `You accepted the invite to <strong style="color:#f5f0e8">${team.name}</strong>!<br/><br/>Sign up on Wandr with <strong style="color:#d4a853">${email}</strong> and you will be added automatically.`, "#7a9e7e"));
    }
    const alreadyMember = team.members.some(m => m.user.toString() === user._id.toString());
    if (alreadyMember) { await team.save(); return res.send(invitePage("Already a Member", "✦", `You are already in <strong style="color:#f5f0e8">${team.name}</strong>. Open Wandr to see your team!`, "#d4a853")); }
    team.members.push({ user: user._id });
    await team.save();
    res.send(invitePage("You're In!", "🎉", `You joined <strong style="color:#f5f0e8">${team.name}</strong>!<br/><br/>Open Wandr and go to your Teams page to explore together.`, "#7a9e7e"));
  } catch (error) {
    res.status(500).send(invitePage("Something went wrong", "❌", "An unexpected error occurred.", "#e05c5c"));
  }
});

// Decline invite via email link
app.get("/teams/invite/decline", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send(invitePage("Invalid Link", "❌", "This invite link is missing or invalid.", "#e05c5c"));
    let decoded;
    try { decoded = jwt.verify(token, process.env.JWT_SECRET); }
    catch { return res.status(400).send(invitePage("Link Expired", "⏰", "This invite link has expired.", "#d4a853")); }
    const { teamId, email } = decoded;
    const team = await Team.findById(teamId);
    if (team) { team.pendingInvites = team.pendingInvites.filter(e => e !== email); await team.save(); }
    res.send(invitePage("Invite Declined", "👋", `No worries! You declined the invite${team ? ` to <strong style="color:#f5f0e8">${team.name}</strong>` : ""}. You can always join later with a team code.`, "#f5f0e8"));
  } catch (error) {
    res.status(500).send(invitePage("Something went wrong", "❌", "An unexpected error occurred.", "#e05c5c"));
  }
});

// Get a single team by ID — after all specific routes so wildcards don't swallow them
app.get("/teams/:id", authMiddleware, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate("owner", "name email")
      .populate("members.user", "name email");

    if (!team) return res.status(404).json({ message: "Team not found" });

    const isMember = team.members.some(m => m.user._id.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ message: "Not a member of this team" });

    res.json({ team });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── Helper: render a nice HTML response page ──────────────────
function invitePage(title, emoji, message, color) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>${title} — Wandr</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          min-height: 100vh;
          background: #1a1510;
          display: flex; align-items: center; justify-content: center;
          font-family: 'DM Sans', sans-serif;
          color: #f5f0e8;
          padding: 24px;
        }
        .card {
          background: rgba(245,240,232,0.05);
          border: 1px solid rgba(245,240,232,0.12);
          border-radius: 24px;
          padding: 56px 48px;
          max-width: 460px;
          width: 100%;
          text-align: center;
        }
        .emoji { font-size: 56px; margin-bottom: 20px; }
        .logo { color: #c4622d; font-size: 13px; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 28px; font-weight: 500; }
        h1 { font-family: 'Playfair Display', serif; font-size: 28px; margin-bottom: 12px; color: ${color}; }
        p { font-size: 15px; color: rgba(245,240,232,0.6); line-height: 1.7; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">✦ WANDR</div>
        <div class="emoji">${emoji}</div>
        <h1>${title}</h1>
        <p>${message}</p>
      </div>
    </body>
    </html>
  `;
}

// Invite someone by email — sends Accept/Decline links
app.post("/teams/:id/invite", authMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const team = await Team.findById(req.params.id).populate("owner", "name email");
    if (!team) return res.status(404).json({ message: "Team not found" });

    const isMember = team.members.some(m => m.user.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ message: "Not authorized" });

    // Check if already a member
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const alreadyMember = team.members.some(m => m.user.toString() === existingUser._id.toString());
      if (alreadyMember) return res.status(400).json({ message: "User is already in the team" });
    }

    // Add to pending invites
    if (!team.pendingInvites.includes(email)) {
      team.pendingInvites.push(email);
      await team.save();
    }

    // Generate a short-lived invite token (no login required)
    const inviteToken = jwt.sign(
      { teamId: team._id.toString(), email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
    const acceptLink  = `${BASE_URL}/teams/invite/accept?token=${inviteToken}`;
    const declineLink = `${BASE_URL}/teams/invite/decline?token=${inviteToken}`;

    const inviterUser = await User.findById(req.user.id).select("name email");

    const mailOptions = {
      from: `"Wandr" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `${inviterUser.name} invited you to join "${team.name}" on Wandr ✦`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 540px; margin: 0 auto; background: #1a1510; color: #f5f0e8; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #c4622d, #d4a853); padding: 32px; text-align: center;">
            <div style="font-size: 26px; font-weight: bold; letter-spacing: 4px;">✦ WANDR</div>
          </div>
          <div style="padding: 40px 36px;">
            <h2 style="font-family: Georgia, serif; font-size: 26px; margin: 0 0 16px; color: #f5f0e8;">You've been invited!</h2>
            <p style="color: rgba(245,240,232,0.7); line-height: 1.8; margin: 0 0 32px; font-size: 15px;">
              <strong style="color: #d4a853;">${inviterUser.name}</strong>
              <span style="color: rgba(245,240,232,0.4); font-size: 13px;"> (${inviterUser.email})</span>
              has invited you to join their travel team
              <strong style="color: #f5f0e8;"> "${team.name}"</strong> on Wandr.
              ${team.description ? `<br/><br/><em style="color:rgba(245,240,232,0.5)">${team.description}</em>` : ""}
            </p>

            <div style="display: flex; gap: 12px; justify-content: center; margin-bottom: 32px;">
              <a href="${acceptLink}" style="display: inline-block; background: #c4622d; color: white; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-family: Arial, sans-serif; font-size: 15px; font-weight: bold;">
                ✓ Accept
              </a>
              <a href="${declineLink}" style="display: inline-block; background: transparent; color: rgba(245,240,232,0.6); text-decoration: none; padding: 14px 36px; border-radius: 10px; font-family: Arial, sans-serif; font-size: 15px; border: 1px solid rgba(245,240,232,0.2);">
                ✕ Decline
              </a>
            </div>

            <p style="color: rgba(245,240,232,0.3); font-size: 12px; text-align: center; line-height: 1.6;">
              This invite expires in 7 days. If you don't have a Wandr account yet,<br/>you'll be added automatically when you sign up with this email.
            </p>
          </div>
          <div style="padding: 20px 36px; border-top: 1px solid rgba(245,240,232,0.08); text-align: center;">
            <p style="color: rgba(245,240,232,0.3); font-size: 12px; margin: 0;">© 2026 Wandr. Made for those who wander.</p>
          </div>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      res.json({ message: `Invite sent to ${email}` });
    } catch (mailErr) {
      console.error("Mail error:", mailErr);
      res.status(207).json({ message: "Invite recorded but email could not be sent. Check EMAIL_USER and EMAIL_PASS in .env" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Lock / unlock team registration (owner only)
app.post("/teams/:id/lock", authMiddleware, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found" });
    if (team.owner.toString() !== req.user.id)
      return res.status(403).json({ message: "Only the owner can lock/unlock the team" });

    team.isLocked = !team.isLocked;
    await team.save();
    res.json({ message: team.isLocked ? "Team registration closed" : "Team registration opened", isLocked: team.isLocked });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Start vacation (owner only)
app.post("/teams/:id/vacation/start", authMiddleware, async (req, res) => {
  try {
    const { destination } = req.body;
    if (!destination) return res.status(400).json({ message: "Destination is required" });

    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found" });
    if (team.owner.toString() !== req.user.id)
      return res.status(403).json({ message: "Only the owner can start a vacation" });
    if (team.vacation.active)
      return res.status(400).json({ message: "A vacation is already active" });

    team.isLocked = true; // auto-lock when vacation starts
    team.vacation = { active: true, destination, startedAt: new Date() };
    await team.save();

    const populated = await Team.findById(team._id)
      .populate("owner", "name email")
      .populate("members.user", "name email");
    res.json({ message: `Vacation to ${destination} started!`, team: populated });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// End vacation (owner only)
app.post("/teams/:id/vacation/end", authMiddleware, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found" });
    if (team.owner.toString() !== req.user.id)
      return res.status(403).json({ message: "Only the owner can end a vacation" });
    if (!team.vacation.active)
      return res.status(400).json({ message: "No active vacation" });

    team.vacation = { active: false, destination: "", startedAt: null };
    team.isLocked = false;
    await team.save();

    const populated = await Team.findById(team._id)
      .populate("owner", "name email")
      .populate("members.user", "name email");
    res.json({ message: "Vacation ended!", team: populated });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Leave a team
app.post("/teams/:id/leave", authMiddleware, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (team.owner.toString() === req.user.id) {
      return res.status(400).json({ message: "Owner cannot leave. Delete the team instead." });
    }

    team.members = team.members.filter(m => m.user.toString() !== req.user.id);
    await team.save();
    res.json({ message: "Left the team" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a team (owner only)
app.delete("/teams/:id", authMiddleware, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found" });
    if (team.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the owner can delete the team" });
    }
    await Team.findByIdAndDelete(req.params.id);
    res.json({ message: "Team deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
