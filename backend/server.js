const express  = require("express");
const cors     = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const http     = require("http");
const { Server } = require("socket.io");
const app      = express();
const server   = http.createServer(app);
const io       = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      if (!origin) return callback(null, true);
      if (origin.includes("vercel.app") || origin.includes("localhost")) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});
const User    = require("./models/User");
const Team    = require("./models/Team");
const Message = require("./models/Message");
const jwt     = require("jsonwebtoken");
const authMiddleware = require("./middleware/auth");
const bcrypt  = require("bcrypt");
const nodemailer = require("nodemailer");
const Groq = require("groq-sdk");

app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    // allow all vercel deployments and localhost
    if (
      origin.includes("vercel.app") ||
      origin.includes("localhost") ||
      origin === process.env.FRONTEND_URL
    ) {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const PORT = process.env.PORT || 5001;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("mongodb connected"))
  .catch(err => console.log(err));

// ── Email transporter ──────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS
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

// ── FORGOT PASSWORD ───────────────────────────────────────────

app.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    // Always return success to prevent email enumeration
    if (!user) return res.json({ message: "If that email exists, a reset link has been sent." });

    // Generate a secure random token
    const resetToken  = require("crypto").randomBytes(32).toString("hex");
    const resetExpiry = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes

    user.resetToken       = resetToken;
    user.resetTokenExpiry = resetExpiry;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: `"Wandr" <shreyabadoni01@gmail.com>`,
      to:   email,
      subject: "Reset your Wandr password",
      html: `
        <div style="font-family: 'DM Sans', Arial, sans-serif; background: #1a1510; padding: 40px; max-width: 520px; margin: 0 auto; border-radius: 16px;">
          <div style="text-align:center; margin-bottom: 32px;">
            <h1 style="font-family: Georgia, serif; color: #f5f0e8; font-size: 28px; margin: 0;">Wandr ✈️</h1>
          </div>
          <div style="background: rgba(245,240,232,0.05); border: 1px solid rgba(245,240,232,0.1); border-radius: 12px; padding: 28px;">
            <h2 style="color: #f5f0e8; font-size: 20px; margin: 0 0 12px;">Reset your password</h2>
            <p style="color: rgba(245,240,232,0.6); font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
              We received a request to reset your password. Click the button below to create a new one. This link expires in <strong style="color:#f5f0e8;">30 minutes</strong>.
            </p>
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${resetUrl}"
                style="display:inline-block; background: #c4622d; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">
                Reset Password →
              </a>
            </div>
            <p style="color: rgba(245,240,232,0.35); font-size: 12px; text-align:center; margin: 0;">
              If you did not request this, you can safely ignore this email.
            </p>
          </div>
        </div>
      `
    });

    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Failed to send reset email" });
  }
});

app.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: "Token and password are required" });
    if (password.length < 6)  return res.status(400).json({ message: "Password must be at least 6 characters" });

    const user = await User.findOne({
      resetToken:       token,
      resetTokenExpiry: { $gt: new Date() } // token not expired
    });

    if (!user) return res.status(400).json({ message: "Reset link is invalid or has expired" });

    user.password          = await bcrypt.hash(password, 10);
    user.resetToken        = null;
    user.resetTokenExpiry  = null;
    await user.save();

    res.json({ message: "Password reset successful. You can now log in." });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ name: user.name, email: user.email, avatar: user.avatar, bio: user.bio, location: user.location });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { name, email, bio, location } = req.body;
    if (!name || !email) return res.status(400).json({ message: "Name and email are required" });
    const existing = await User.findOne({ email });
    if (existing && existing._id.toString() !== req.user.id) {
      return res.status(400).json({ message: "Email already in use" });
    }
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { name, email, bio: bio || "", location: location || "" },
      { new: true }
    ).select("-password");
    if (!updatedUser) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Profile updated", name: updatedUser.name, email: updatedUser.email, avatar: updatedUser.avatar, bio: updatedUser.bio, location: updatedUser.location });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Upload avatar (base64)
app.put("/profile/avatar", authMiddleware, async (req, res) => {
  try {
    const { avatar } = req.body;
    if (!avatar) return res.status(400).json({ message: "No image provided" });

    // Limit size to ~2MB base64
    if (avatar.length > 2.5 * 1024 * 1024)
      return res.status(400).json({ message: "Image too large. Please use an image under 2MB." });

    await User.findByIdAndUpdate(req.user.id, { avatar });
    res.json({ message: "Avatar updated", avatar });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Travel stats
app.get("/profile/stats", authMiddleware, async (req, res) => {
  try {
    const Bill = require("./models/Bill");

    // Teams the user is part of
    const teams = await Team.find({
      $or: [{ owner: req.user.id }, { "members.user": req.user.id }]
    }).populate("members.user", "name");

    const totalTeams      = teams.length;
    const totalMembers    = [...new Set(teams.flatMap(t => t.members.map(m => m.user._id.toString())))].length;
    const vacations       = teams.filter(t => t.vacation && (t.vacation.active || t.vacation.destination));
    const activeVacations = vacations.filter(t => t.vacation.active).length;
    const totalTrips      = vacations.length;
    const destinations    = [...new Set(vacations.map(t => t.vacation.destination).filter(Boolean))];

    // Bills
    const myBills       = await Bill.find({ paidBy: req.user.id });
    const totalPaid     = myBills.reduce((s, b) => s + b.amount, 0);
    const billsInvolved = await Bill.find({ members: req.user.id });
    const totalSpent    = billsInvolved.reduce((s, b) => s + b.splitAmount, 0);

    // Member since
    const user        = await User.findById(req.user.id);
    const memberSince = user.createdAt;

    res.json({
      totalTeams,
      totalTrips,
      activeVacations,
      totalMembers,
      totalPaid:    parseFloat(totalPaid.toFixed(2)),
      totalSpent:   parseFloat(totalSpent.toFixed(2)),
      destinations,
      memberSince,
    });
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
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar");

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
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar");

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
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar");

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
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar");

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

    const team = await Team.findById(req.params.id).populate("owner", "name email avatar");
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
      from: `"Wandr" <shreyabadoni01@gmail.com>`,
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

    team.isLocked = true;
    const tripId = new mongoose.Types.ObjectId();
    team.vacation = { active: true, destination, startedAt: new Date(), tripId };
    await team.save();

    const populated = await Team.findById(team._id)
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar");
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

    // Save to pastVacations history
    const tripId = team.vacation.tripId || new mongoose.Types.ObjectId();
    team.pastVacations.push({
      _id:         tripId,
      destination: team.vacation.destination,
      startedAt:   team.vacation.startedAt,
      endedAt:     new Date(),
      members:     team.members.map(m => m.user)
    });

    // Tag all untagged bills of this team with this tripId
    await Bill.updateMany(
      { team: team._id, tripId: null },
      { $set: { tripId } }
    );

    team.vacation = { active: false, destination: "", startedAt: null, tripId: null };
    team.isLocked = false;
    await team.save();

    const populated = await Team.findById(team._id)
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar");
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

// ── TRIPS ROUTES ──────────────────────────────────────────────

// Get all past trips for the current user (across all teams)
app.get("/trips", authMiddleware, async (req, res) => {
  try {
    const teams = await Team.find({
      $or: [{ owner: req.user.id }, { "members.user": req.user.id }]
    }).populate("pastVacations.members", "name email avatar");

    const trips = [];
    teams.forEach(team => {
      // Active vacation counts too
      if (team.vacation?.active) {
        trips.push({
          tripId:      team.vacation.tripId || team._id,
          teamId:      team._id,
          teamName:    team.name,
          destination: team.vacation.destination,
          startedAt:   team.vacation.startedAt,
          endedAt:     null,
          active:      true,
          memberCount: team.members.length,
        });
      }
      team.pastVacations.forEach(v => {
        trips.push({
          tripId:      v._id,
          teamId:      team._id,
          teamName:    team.name,
          destination: v.destination,
          startedAt:   v.startedAt,
          endedAt:     v.endedAt,
          active:      false,
          memberCount: v.members.length,
        });
      });
    });

    // Sort newest first
    trips.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    res.json({ trips });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get a single trip detail — members + bills
app.get("/trips/:tripId", authMiddleware, async (req, res) => {
  try {
    const { tripId } = req.params;

    // Find the team that has this trip
    const team = await Team.findOne({
      $or: [
        { "pastVacations._id": tripId },
        { "vacation.tripId": tripId }
      ]
    })
      .populate("members.user", "name email avatar")
      .populate("pastVacations.members", "name email avatar");

    if (!team) return res.status(404).json({ message: "Trip not found" });

    const isMember = team.members.some(m => m.user._id.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ message: "Not a team member" });

    // Get trip snapshot
    let trip;
    if (team.vacation?.active && team.vacation.tripId?.toString() === tripId) {
      trip = {
        tripId,
        teamId:      team._id,
        teamName:    team.name,
        destination: team.vacation.destination,
        startedAt:   team.vacation.startedAt,
        endedAt:     null,
        active:      true,
        members:     team.members.map(m => m.user),
      };
    } else {
      const v = team.pastVacations.id(tripId);
      if (!v) return res.status(404).json({ message: "Trip not found" });
      trip = {
        tripId,
        teamId:      team._id,
        teamName:    team.name,
        destination: v.destination,
        startedAt:   v.startedAt,
        endedAt:     v.endedAt,
        active:      false,
        members:     v.members,
      };
    }

    // Get bills for this trip
    const bills = await Bill.find({ team: team._id, tripId })
      .populate("paidBy",    "name email avatar")
      .populate("members",   "name email avatar")
      .populate("settledBy", "name email avatar")
      .sort({ createdAt: -1 });

    const totalSpent = bills.reduce((s, b) => s + b.amount, 0);

    res.json({ trip, bills, totalSpent });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── BILL ROUTES ───────────────────────────────────────────────
const Bill = require("./models/Bill");

// Add a bill to a team
app.post("/teams/:id/bills", authMiddleware, async (req, res) => {
  try {
    const { title, amount, currency, paidBy, members, category, note } = req.body;
    if (!title || !amount || !paidBy || !members?.length)
      return res.status(400).json({ message: "title, amount, paidBy and members are required" });

    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const isMember = team.members.some(m => m.user.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ message: "Not a team member" });

    const splitAmount = parseFloat((amount / members.length).toFixed(2));

    const bill = new Bill({
      team: req.params.id,
      title, amount, currency: currency || "INR",
      paidBy, members, splitAmount,
      category: category || "General",
      note: note || "",
      settledBy: [paidBy],
      tripId: team.vacation?.active ? (team.vacation.tripId || null) : null
    });

    await bill.save();
    const populated = await Bill.findById(bill._id)
      .populate("paidBy", "name email avatar")
      .populate("members", "name email avatar")
      .populate("settledBy", "name email avatar");

    res.status(201).json({ message: "Bill added", bill: populated });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get all bills for a team
app.get("/teams/:id/bills", authMiddleware, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const isMember = team.members.some(m => m.user.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ message: "Not a team member" });

    const bills = await Bill.find({ team: req.params.id })
      .populate("paidBy", "name email avatar")
      .populate("members", "name email avatar")
      .populate("settledBy", "name email avatar")
      .sort({ createdAt: -1 });

    // Calculate who owes what to whom
    const balances = {};
    const memberMap = {};

    bills.forEach(bill => {
      bill.members.forEach(m => { memberMap[m._id] = m.name; });
      memberMap[bill.paidBy._id] = bill.paidBy.name;

      bill.members.forEach(member => {
        const memberId = member._id.toString();
        const payerId  = bill.paidBy._id.toString();
        if (memberId === payerId) return;

        const alreadySettled = bill.settledBy.some(s => s._id.toString() === memberId);
        if (alreadySettled) return;

        const key = `${memberId}_${payerId}`;
        balances[key] = (balances[key] || 0) + bill.splitAmount;
      });
    });

    // Simplify: net balances
    const settlements = Object.entries(balances).map(([key, amount]) => {
      const [from, to] = key.split("_");
      return { from, fromName: memberMap[from], to, toName: memberMap[to], amount: parseFloat(amount.toFixed(2)) };
    }).filter(s => s.amount > 0);

    res.json({ bills, settlements });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Mark yourself as settled on a bill
app.post("/bills/:billId/settle", authMiddleware, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.billId);
    if (!bill) return res.status(404).json({ message: "Bill not found" });

    const alreadySettled = bill.settledBy.some(s => s.toString() === req.user.id);
    if (alreadySettled) return res.status(400).json({ message: "Already marked as settled" });

    bill.settledBy.push(req.user.id);
    await bill.save();

    const populated = await Bill.findById(bill._id)
      .populate("paidBy", "name email avatar")
      .populate("members", "name email avatar")
      .populate("settledBy", "name email avatar");

    res.json({ message: "Marked as settled", bill: populated });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a bill (only payer or team owner)
app.delete("/bills/:billId", authMiddleware, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.billId).populate("team");
    if (!bill) return res.status(404).json({ message: "Bill not found" });

    const isPayer = bill.paidBy.toString() === req.user.id;
    const isOwner = bill.team.owner.toString() === req.user.id;
    if (!isPayer && !isOwner)
      return res.status(403).json({ message: "Only the payer or team owner can delete this bill" });

    await Bill.findByIdAndDelete(req.params.billId);
    res.json({ message: "Bill deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── HOTEL ROUTES ──────────────────────────────────────────────
const Hotel = require("./models/Hotel");

// Add a hotel booking to a team
app.post("/teams/:id/hotels", authMiddleware, async (req, res) => {
  try {
    const { name, address, checkIn, checkOut, pricePerNight, currency, rooms, notes, bookedMembers } = req.body;
    if (!name || !checkIn || !checkOut || !pricePerNight)
      return res.status(400).json({ message: "name, checkIn, checkOut and pricePerNight are required" });

    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const isMember = team.members.some(m => m.user.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ message: "Not a team member" });

    const nights     = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / (1000*60*60*24)));
    const totalPrice = parseFloat((pricePerNight * (rooms || 1) * nights).toFixed(2));

    const hotel = new Hotel({
      team:        req.params.id,
      tripId:      team.vacation?.active ? (team.vacation.tripId || null) : null,
      addedBy:     req.user.id,
      name, address: address || "",
      destination: team.vacation?.destination || "",
      checkIn, checkOut,
      pricePerNight, currency: currency || "INR",
      rooms: rooms || 1,
      totalPrice, notes: notes || "",
      bookedMembers: bookedMembers || team.members.map(m => m.user),
    });

    await hotel.save();
    const populated = await Hotel.findById(hotel._id)
      .populate("addedBy", "name email avatar")
      .populate("bookedMembers", "name email avatar");

    res.status(201).json({ message: "Hotel booking added", hotel: populated });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get all hotels for a team
app.get("/teams/:id/hotels", authMiddleware, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const isMember = team.members.some(m => m.user.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ message: "Not a team member" });

    const hotels = await Hotel.find({ team: req.params.id })
      .populate("addedBy", "name email avatar")
      .populate("bookedMembers", "name email avatar")
      .sort({ checkIn: 1 });

    res.json({ hotels });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Update hotel status
app.patch("/hotels/:hotelId/status", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["planned", "confirmed", "cancelled"].includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const hotel = await Hotel.findById(req.params.hotelId).populate("team");
    if (!hotel) return res.status(404).json({ message: "Hotel not found" });

    const isMember = hotel.team.members.some(m => m.user.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ message: "Not authorized" });

    hotel.status = status;
    await hotel.save();
    res.json({ message: "Status updated", hotel });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a hotel booking
app.delete("/hotels/:hotelId", authMiddleware, async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.hotelId).populate("team");
    if (!hotel) return res.status(404).json({ message: "Hotel not found" });

    const isAdder = hotel.addedBy.toString() === req.user.id;
    const isOwner = hotel.team.owner.toString() === req.user.id;
    if (!isAdder && !isOwner)
      return res.status(403).json({ message: "Only the person who added it or the team owner can delete" });

    await Hotel.findByIdAndDelete(req.params.hotelId);
    res.json({ message: "Hotel booking deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── PLACES / EXPLORE ROUTES ───────────────────────────────────

// Search hotels / restaurants / attractions via Google Places
app.get("/explore/search", authMiddleware, async (req, res) => {
  try {
    const { destination, type } = req.query;
    if (!destination) return res.status(400).json({ message: "destination is required" });

    const PLACES_KEY = process.env.GOOGLE_PLACES_KEY;
    if (!PLACES_KEY) return res.status(500).json({ message: "Google Places API key not configured" });

    // type: hotel | restaurant | tourist_attraction
    const query      = encodeURIComponent(`${type || "hotel"} in ${destination}`);
    const searchUrl  = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${PLACES_KEY}`;

    const response = await fetch(searchUrl);
    const data     = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS")
      return res.status(500).json({ message: `Places API error: ${data.status}` });

    const places = (data.results || []).slice(0, 15).map(p => ({
      id:           p.place_id,
      name:         p.name,
      address:      p.formatted_address,
      rating:       p.rating,
      totalRatings: p.user_ratings_total,
      priceLevel:   p.price_level, // 0-4
      types:        p.types,
      location:     p.geometry?.location,
      photo:        p.photos?.[0]?.photo_reference
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${p.photos[0].photo_reference}&key=${PLACES_KEY}`
        : null,
      mapsUrl: `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
      open:    p.opening_hours?.open_now,
    }));

    res.json({ places, destination });
  } catch (error) {
    console.error("Places error:", error);
    res.status(500).json({ message: "Failed to fetch places" });
  }
});

// ── CHAT ROUTES ───────────────────────────────────────────────

// Get message history for a team
app.get("/teams/:id/messages", authMiddleware, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found" });
    const isMember = team.members.some(m => m.user.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ message: "Not a team member" });

    const messages = await Message.find({ team: req.params.id })
      .populate("sender", "name email avatar")
      .sort({ createdAt: 1 })
      .limit(100);

    res.json({ messages });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── SOCKET.IO ─────────────────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("No token"));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userEmail = decoded.email;
    next();
  } catch { next(new Error("Invalid token")); }
});

io.on("connection", (socket) => {
  // Join a team room
  socket.on("join_team", (teamId) => {
    socket.join(teamId);
  });

  // Handle sending a message
  socket.on("send_message", async ({ teamId, content }) => {
    try {
      if (!content?.trim()) return;

      const user = await User.findById(socket.userId).select("name email avatar");
      const msg  = await Message.create({ team: teamId, sender: socket.userId, content: content.trim() });

      const populated = await Message.findById(msg._id).populate("sender", "name email avatar");
      io.to(teamId).emit("new_message", populated);

      // Check if message is asking AI (starts with @ai or @bot)
      const isAIQuery = content.trim().toLowerCase().startsWith("@ai") || content.trim().toLowerCase().startsWith("@bot");
      if (isAIQuery && process.env.GROQ_API_KEY) {
        const team = await Team.findById(teamId);
        const question = content.replace(/@ai|@bot/gi, "").trim();

        try {
          const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: `You are a helpful travel assistant for a group trip to ${team?.vacation?.destination || "their destination"}. 
                Help with hotel recommendations, restaurant suggestions, itinerary planning, local tips, and budget advice. 
                Keep responses concise and friendly. Use emojis occasionally.`
              },
              { role: "user", content: question }
            ],
            max_tokens: 400,
          });

          const aiReply = completion?.choices?.[0]?.message?.content;
          if (!aiReply) throw new Error("Empty response from Groq: " + JSON.stringify(completion));

          const aiMsg      = await Message.create({ team: teamId, sender: null, content: aiReply, isAI: true });
          const aiPopulated = await Message.findById(aiMsg._id);
          io.to(teamId).emit("new_message", aiPopulated);
        } catch (aiErr) {
          console.error("Groq full error:", JSON.stringify(aiErr, null, 2));
          console.error("Groq error message:", aiErr?.message);
          console.error("Groq error status:", aiErr?.status);
          const errMsg = await Message.create({ team: teamId, sender: null, content: `AI error: ${aiErr?.message || aiErr?.error?.message || "Unknown error"}`, isAI: true });
          io.to(teamId).emit("new_message", errMsg);
        }
      }
    } catch (err) {
      console.error("Socket message error:", err);
    }
  });

  socket.on("disconnect", () => {});
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
