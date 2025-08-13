// auth/authController.js
const { supabase } = require('./config');

/**
 * User signup with email and password
 */
const signup = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(201).json({ 
      message: 'Signup successful', 
      user: data.user,
      session: data.session 
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * User login with email and password
 */
const login = async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return res.status(401).json({ error: error.message });
      }
      
      // Set cookies for authentication
      const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days
      res.cookie('access_token', data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // secure in production
        sameSite: 'strict',
        maxAge: expiresIn
      });
      
      res.cookie('refresh_token', data.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      return res.status(200).json({
        message: 'Login successful',
        user: data.user,
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });
      
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * User logout
 */
const logout = async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get current user
 */
const getCurrentUser = async (req, res) => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      return res.status(401).json({ error: error.message });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    return res.status(200).json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Reset password
 */
const resetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(200).json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// auth/authController.js - Add this function

/**
 * Refresh the user's session token
 */
const refreshToken = async (req, res) => {
    try {
      const { refresh_token } = req.body;
      
      if (!refresh_token) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }
      
      const { data, error } = await supabase.auth.refreshSession({ refresh_token });
      
      if (error) {
        return res.status(401).json({ error: error.message });
      }
      
      return res.status(200).json({ 
        message: 'Token refreshed successfully',
        session: data.session,
        user: data.user
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
};

// auth/authController.js - Add these functions

/**
 * Resend verification email
 */
const resendVerificationEmail = async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(200).json({ message: 'Verification email resent' });
    } catch (error) {
      console.error('Resend verification error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Verify email with token from email link
 */
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
        return res.status(400).json({ error: 'Verification token is required' });
        }
        
        // This would typically be handled by Supabase directly via email links
        // But you can implement a custom verification endpoint if needed
        
        return res.status(200).json({ message: 'Email verification successful' });
    } catch (error) {
        console.error('Email verification error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// auth/authController.js - Add this function

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
    try {
      // Ensure user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const { full_name, avatar_url } = req.body;
      const updates = {};
      
      if (full_name) updates.full_name = full_name;
      if (avatar_url) updates.avatar_url = avatar_url;
      
      // Update user metadata
      const { data, error } = await supabase.auth.updateUser({
        data: updates
      });
      
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      
      // If you have a separate profiles table, update it here
      // const { error: profileError } = await supabase
      //   .from('profiles')
      //   .upsert({ 
      //     id: user.id, 
      //     full_name, 
      //     avatar_url,
      //     updated_at: new Date() 
      //   });
      
      // if (profileError) {
      //   return res.status(400).json({ error: profileError.message });
      // }
      
      return res.status(200).json({ 
        message: 'Profile updated successfully',
        user: data.user
      });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
};

// auth/authController.js - Add this function

/**
 * Change user password
 */
const changePassword = async (req, res) => {
    try {
      const { current_password, new_password } = req.body;
      
      if (!current_password || !new_password) {
        return res.status(400).json({ error: 'Current and new passwords are required' });
      }
      
      // First verify the current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: req.user.email, // Assuming req.user is set by requireAuth middleware
        password: current_password,
      });
      
      if (signInError) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      
      // Update to the new password
      const { error } = await supabase.auth.updateUser({
        password: new_password
      });
      
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
};



module.exports = {
    signup,
    login,
    logout,
    getCurrentUser,
    resetPassword,
    changePassword,
    updateProfile,
    refreshToken,
    resendVerificationEmail,
    verifyEmail
};