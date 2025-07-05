import { verifyToken, findUserById } from '../auth/auth.js';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    const decoded = verifyToken(token);
    const user = findUserById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Add user to request object (without password)
    const { password, ...userWithoutPassword } = user;
    req.user = userWithoutPassword;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireEmailVerification = (req, res, next) => {
  if (!req.user.emailVerified) {
    return res.status(403).json({ 
      error: 'Email verification required',
      message: 'Please verify your email address before accessing this resource'
    });
  }
  next();
};

export const requirePlan = (requiredPlan) => {
  const planHierarchy = {
    'free': 0,
    'pro': 1,
    'business': 2,
    'enterprise': 3
  };
  
  return (req, res, next) => {
    const userPlan = req.user.plan || 'free';
    const userPlanLevel = planHierarchy[userPlan] || 0;
    const requiredPlanLevel = planHierarchy[requiredPlan] || 0;
    
    if (userPlanLevel < requiredPlanLevel) {
      return res.status(403).json({
        error: 'Insufficient plan level',
        message: `This feature requires ${requiredPlan} plan or higher`,
        currentPlan: userPlan,
        requiredPlan: requiredPlan
      });
    }
    
    next();
  };
};