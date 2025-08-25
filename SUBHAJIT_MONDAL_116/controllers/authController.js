import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import cloudinary from '../config/cloudinary.js';
import { sendVerificationEmail } from './emailController.js';

// Generate random verification code
const generateVerificationCode = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Register user
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required'
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists with this email' 
      });
    }

    // Upload image to Cloudinary if provided
    let profileImageUrl = '';
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path);
        profileImageUrl = result.secure_url;
      } catch (uploadErr) {
        console.error('Cloudinary upload failed:', uploadErr);
        // Continue without image rather than failing registration
        profileImageUrl = '';
      }
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();

    // Create new user
    const newUser = new User({
      name,
      email,
      password,
      profileImage: profileImageUrl,
      verificationCode
    });

    await newUser.save();

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationCode);
    } catch (mailErr) {
      console.error('Email send failed:', mailErr);
      // Do not block registration if email fails; user can request a new code later (not implemented)
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification.'
    });
  } catch (error) {
    console.error('Registration error:', error);
    // Handle duplicate key error from MongoDB
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
    });
  }
};

// Verify email
export const verifyEmail = async (req, res) => {
  try {
    const { code } = req.params;
    
    const user = await User.findOne({ verificationCode: code });
    
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid verification code' 
      });
    }

    user.isVerified = true;
    user.verificationCode = ''; // Clear the verification code
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now login.'
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during verification' 
    });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please verify your email before logging in' 
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
};