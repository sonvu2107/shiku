// Temporary auth endpoints for IP development
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const tempRouter = express.Router();

function sign(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// Login with token response
tempRouter.post("/login-token", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
    const token = sign(user);
    res.json({ 
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      token
    });
  } catch (e) { next(e); }
});

// Register with token response  
tempRouter.post("/register-token", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Vui lòng điền đầy đủ thông tin" });
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: "Email này đã được đăng ký" });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash });
    const token = sign(user);
    res.json({ 
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      token
    });
  } catch (e) { next(e); }
});

export default tempRouter;
