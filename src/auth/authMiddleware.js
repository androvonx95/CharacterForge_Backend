// auth/authMiddleware.js - Enhanced version

const { supabase } = require('./config');

/**
 * Extract JWT token from request
 */
const extractToken = (req) => {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.access_token) {
    return req.cookies.access_token;
  }
  return null;
};

/**
 * Middleware to protect routes - requires authentication
 */
const requireAuth = async (req, res, next) => {
  try {
    // Get JWT from the Authorization header or cookies
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Verify the token and get user
    const { data, error } = await supabase.auth.getUser(token);
    console.log( data );
    console.log( error );
    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Add the user to the request object
    req.user = data.user;
    req.token = token;
    
    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Optional authentication middleware - doesn't require auth but adds user if present
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (token) {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) {
        req.user = data.user;
      }
    }
    
    next();
  } catch (error) {
    // Just continue without authentication
    next();
  }
};

/**
 * Role-based authorization middleware
 * @param {Array} allowedRoles - Array of roles allowed to access the route
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    // First ensure the user is authenticated
    requireAuth(req, res, () => {
      // Check if user has the required role
      // This assumes roles are stored in user.app_metadata.roles
      const userRoles = req.user.app_metadata?.roles || [];
      
      const hasAllowedRole = allowedRoles.some(role => userRoles.includes(role));
      
      if (!hasAllowedRole) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      next();
    });
  };
};

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole
};







