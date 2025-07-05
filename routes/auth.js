import express from 'express';
import { body, validationResult } from 'express-validator';
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  comparePassword,
  generateToken,
  createVerificationToken,
  verifyEmailToken,
  createPasswordResetToken,
  resetPassword
} from '../auth/auth.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../email/emailService.js';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').optional().isLength({ min: 1 }).trim()
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 }).withMessage('Password is required')
];

const passwordResetValidation = [
  body('email').isEmail().normalizeEmail()
];

const resetPasswordValidation = [
  body('token').isLength({ min: 1 }).withMessage('Token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

// Register new user
router.post('/register', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;
    
    const user = await createUser({ email, password, name });
    
    // Create verification token and send email
    const verificationToken = createVerificationToken(user.id, user.email);
    await sendVerificationEmail(user.email, verificationToken);
    
    res.status(201).json({
      message: 'User registered successfully. Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Login user
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    
    const user = findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login
    updateUser(user.id, { lastLoginAt: new Date().toISOString() });
    
    // Generate token
    const token = generateToken(user.id);
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        plan: user.plan,
        searchesUsed: user.searchesUsed,
        searchLimit: user.searchLimit
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }
    
    const decoded = verifyEmailToken(token);
    
    res.json({
      message: 'Email verified successfully',
      userId: decoded.userId
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Request password reset
router.post('/forgot-password', passwordResetValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    
    const user = findUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }
    
    const resetToken = createPasswordResetToken(user.id, user.email);
    await sendPasswordResetEmail(user.email, resetToken);
    
    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password
router.post('/reset-password', resetPasswordValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;
    
    await resetPassword(token, password);
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get user profile (protected route)
router.get('/profile', authenticateToken, (req, res) => {
  res.json({
    user: req.user
  });
});

// Update user profile (protected route)
router.put('/profile', authenticateToken, [
  body('name').optional().isLength({ min: 1 }).trim(),
  body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email } = req.body;
    const updates = {};
    
    if (name) updates.name = name;
    if (email && email !== req.user.email) {
      // Check if new email already exists
      const existingUser = findUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      updates.email = email;
      updates.emailVerified = false; // Require re-verification
    }
    
    const updatedUser = updateUser(req.user.id, updates);
    
    // If email was changed, send verification email
    if (email && email !== req.user.email) {
      const verificationToken = createVerificationToken(updatedUser.id, updatedUser.email);
      await sendVerificationEmail(updatedUser.email, verificationToken);
    }
    
    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token (for frontend to check if token is valid)
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

export default router;