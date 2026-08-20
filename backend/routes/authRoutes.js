import express from 'express';
import {
  signup,
  login,
  logout,
  refreshAccessToken,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// ── Public Routes ──
router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh-token', refreshAccessToken);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// ── Private Routes ──
router.use(protect); // All routes below require authentication
router.post('/logout', logout);
router.get('/me', getMe);
router.post('/resend-verification', resendVerification);
router.put('/change-password', changePassword);

export default router;
