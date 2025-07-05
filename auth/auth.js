const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { readFileSync, writeFileSync, existsSync } = require('fs');
const { join } = require('path');

// __dirname is available by default in CommonJS

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secure-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = '7d';

// File paths
const USERS_FILE = join(__dirname, '../data/users.json');
const VERIFICATION_TOKENS_FILE = join(__dirname, '../data/verification-tokens.json');

// Helper functions for file operations
const readUsers = () => {
  if (!existsSync(USERS_FILE)) {
    writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
    return [];
  }
  try {
    return JSON.parse(readFileSync(USERS_FILE, 'utf8'));
  } catch (error) {
    console.error('Error reading users file:', error);
    return [];
  }
};

const writeUsers = (users) => {
  try {
    writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error writing users file:', error);
    throw new Error('Failed to save user data');
  }
};

const readVerificationTokens = () => {
  if (!existsSync(VERIFICATION_TOKENS_FILE)) {
    writeFileSync(VERIFICATION_TOKENS_FILE, JSON.stringify([], null, 2));
    return [];
  }
  try {
    return JSON.parse(readFileSync(VERIFICATION_TOKENS_FILE, 'utf8'));
  } catch (error) {
    console.error('Error reading verification tokens file:', error);
    return [];
  }
};

const writeVerificationTokens = (tokens) => {
  try {
    writeFileSync(VERIFICATION_TOKENS_FILE, JSON.stringify(tokens, null, 2));
  } catch (error) {
    console.error('Error writing verification tokens file:', error);
    throw new Error('Failed to save verification token');
  }
};

// Generate JWT token
export const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Verify JWT token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Hash password
export const hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

// Compare password
export const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// User management functions
export const createUser = async (userData) => {
  const users = readUsers();
  
  // Check if user already exists
  const existingUser = users.find(user => user.email === userData.email);
  if (existingUser) {
    throw new Error('User already exists');
  }
  
  // Create new user
  const hashedPassword = await hashPassword(userData.password);
  const newUser = {
    id: Date.now().toString(),
    email: userData.email,
    name: userData.name || userData.email.split('@')[0],
    password: hashedPassword,
    emailVerified: false,
    provider: 'email',
    plan: 'free',
    searchesUsed: 0,
    searchLimit: 10,
    createdAt: new Date().toISOString(),
    lastLoginAt: null
  };
  
  users.push(newUser);
  writeUsers(users);
  
  // Return user without password
  const { password, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
};

export const findUserByEmail = (email) => {
  const users = readUsers();
  return users.find(user => user.email === email);
};

export const findUserById = (id) => {
  const users = readUsers();
  return users.find(user => user.id === id);
};

export const updateUser = (id, updates) => {
  const users = readUsers();
  const userIndex = users.findIndex(user => user.id === id);
  
  if (userIndex === -1) {
    throw new Error('User not found');
  }
  
  users[userIndex] = { ...users[userIndex], ...updates };
  writeUsers(users);
  
  // Return user without password
  const { password, ...userWithoutPassword } = users[userIndex];
  return userWithoutPassword;
};

// Email verification functions
export const createVerificationToken = (userId, email) => {
  const tokens = readVerificationTokens();
  const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '24h' });
  
  // Remove existing tokens for this user
  const filteredTokens = tokens.filter(t => t.userId !== userId);
  
  // Add new token
  filteredTokens.push({
    userId,
    email,
    token,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });
  
  writeVerificationTokens(filteredTokens);
  return token;
};

export const verifyEmailToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const tokens = readVerificationTokens();
    const tokenData = tokens.find(t => t.token === token);
    
    if (!tokenData) {
      throw new Error('Invalid verification token');
    }
    
    // Remove used token
    const filteredTokens = tokens.filter(t => t.token !== token);
    writeVerificationTokens(filteredTokens);
    
    // Update user as verified
    updateUser(decoded.userId, { emailVerified: true });
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired verification token');
  }
};

// Password reset functions
export const createPasswordResetToken = (userId, email) => {
  const token = jwt.sign({ userId, email, type: 'password-reset' }, JWT_SECRET, { expiresIn: '1h' });
  
  const tokens = readVerificationTokens();
  
  // Remove existing password reset tokens for this user
  const filteredTokens = tokens.filter(t => !(t.userId === userId && t.type === 'password-reset'));
  
  // Add new token
  filteredTokens.push({
    userId,
    email,
    token,
    type: 'password-reset',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  });
  
  writeVerificationTokens(filteredTokens);
  return token;
};

export const verifyPasswordResetToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.type !== 'password-reset') {
      throw new Error('Invalid token type');
    }
    
    const tokens = readVerificationTokens();
    const tokenData = tokens.find(t => t.token === token && t.type === 'password-reset');
    
    if (!tokenData) {
      throw new Error('Invalid password reset token');
    }
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired password reset token');
  }
};

export const resetPassword = async (token, newPassword) => {
  try {
    const decoded = verifyPasswordResetToken(token);
    const hashedPassword = await hashPassword(newPassword);
    
    updateUser(decoded.userId, { password: hashedPassword });
    
    // Remove used token
    const tokens = readVerificationTokens();
    const filteredTokens = tokens.filter(t => t.token !== token);
    writeVerificationTokens(filteredTokens);
    
    return true;
  } catch (error) {
    throw error;
  }
};