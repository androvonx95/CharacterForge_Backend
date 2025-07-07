// auth/routes.js - Updated with all endpoints

const express = require('express');
const router = express.Router();
const authController = require('./authController');
const { requireAuth, requireRole } = require('./authMiddleware');
const { 
    signupValidation, 
    loginValidation, 
    passwordResetValidation, 
    passwordChangeValidation 
  } = require('./validation');

// Public routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/reset-password', authController.resetPassword);
router.post('/refresh-token', authController.refreshToken);
router.post('/resend-verification', authController.resendVerificationEmail);
router.post('/verify-email', authController.verifyEmail);

// Protected routes
router.get('/me', requireAuth, authController.getCurrentUser);
router.put('/profile', requireAuth, authController.updateProfile);
router.put('/change-password', requireAuth, authController.changePassword);

// Admin routes example
router.get('/admin/users', requireRole(['admin']), (req, res) => {
  res.json({ message: 'Admin only route' });
});

module.exports = router;