// auth/errorHandler.js

/**
 * Custom error class for authentication errors
 */
class AuthError extends Error {
    constructor(message, statusCode = 400) {
      super(message);
      this.name = 'AuthError';
      this.statusCode = statusCode;
    }
  }
  
  /**
   * Error handler middleware
   */
  const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    
    if (err instanceof AuthError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    
    // Handle Supabase specific errors
    if (err.error_description) {
      return res.status(400).json({ error: err.error_description });
    }
    
    // Default error
    return res.status(500).json({ error: 'Internal server error' });
  };
  
module.exports = {
    AuthError,
    errorHandler
};