import userModel from "../model/userModel.js";
import validator from "validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found, please register",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = createToken(user._id, user.email);
    res.json({
      success: true,
      message: "Login successfully",
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Login failed, please try again",
    });
  }
};

const createToken = (id, email) => {
  const secret = process.env.JWT_SECRET || "dev_secret";
  return jwt.sign({ id, email }, secret, { expiresIn: "7d" });
};

export const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    const exists = await userModel.findOne({ email });

    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists, please login" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new userModel({
      username: username,
      email: email,
      password: hashedPassword,
    });

    const user = await newUser.save();

    const token = createToken(user._id, user.email);
    res.status(201).json({
      success: true,
      token,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Registration failed, please try again",
    });
  }
};

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const secret = process.env.JWT_SECRET || "dev_secret";
      const token = jwt.sign({ id: "admin", email }, secret, {
        expiresIn: "7d",
      });

      res.json({ success: true, token });
    } else {
      res.json({
        success: false,
        message: "Invalid admin credentials",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Admin login failed, please try again",
      error,
    });
  }
};
