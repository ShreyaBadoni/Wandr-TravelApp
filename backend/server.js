const express = require("express");
const cors = require("cors");
require("dotenv").config();
const mongoose=require("mongoose");
const app = express();
const User=require("./models/User")
const jwt=require("jsonwebtoken");
const authMiddleware=require("./middleware/auth");
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT||5001;
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("mongodb connected"))
.catch(err=>console.log(err));

const bcrypt=require("bcrypt");
//signup api
app.post("/signup",async(req,res)=>{
    try{
        const{name,email,password}=req.body;
        const existingUser=await User.findOne({email});
        if(existingUser){
            return res.status(400).json({message:"user already exist"});
        }
        const hashedPassword=await bcrypt.hash(password,10);
        const newuser=new User({
            name,
            email,
            password:hashedPassword
        });
        await newuser.save();
        res.status(201).json
({message:"user created successfully"});
    }
catch(error){
    res.status(500).json({message:"server error"});
}    
});


//login api
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Success
    const token=jwt.sign(
        {id:user.id,email:user.email},
        process.env.JWT_SECRET,
        { expiresIn:"1hr" }
    );
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      name: user.name,
      email: user.email
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
 
app.put("/profile",authMiddleware,async(req,res)=>{
  try{
    const{name,email}=req.body;
    if(!name||!email){
      return res.status(400).json({message:"name and email are required"});
    }
  
  const existing=await User.findOne({email});
  if(existing && existing._id.toString()!==req.user.id){
    return res.status(400).json({message:"email already in use"});
  }
  const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { name, email },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Profile updated", name: updatedUser.name, email: updatedUser.email });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
  
});
app.get("/protected", authMiddleware, (req, res) => {
  res.json({
    message: "You are authorized",
    user: req.user
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

