import crypto from 'crypto';
import Account from '../models/Account.js';
import Session from '../models/Session.js';
import LoginHistory from '../models/LoginHistory.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  parseExpiryToMs,
  parseUserAgent,
} from '../utils/tokenUtils.js';
import { sendWelcomeEmail, sendVerificationEmail, sendPasswordResetEmail } from '../utils/email.js';

/**
 * @desc    Register a new Graxion account
 * @route   POST /api/auth/signup
 * @access  Public
 */
export const signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters',
      });
    }

    // Check if email already exists
    const existingAccount = await Account.findOne({ email: email.toLowerCase() });
    if (existingAccount) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // Create account
    const account = await Account.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
    });

    if (req.body.product === 'mail') {
      if (!account.linkedProducts) account.linkedProducts = {};
      account.linkedProducts.mail = { linked: true, linkedAt: new Date() };
    }

    // Generate email verification token
    const verifyToken = account.createEmailVerifyToken();
    await account.save({ validateBeforeSave: false });

    // Send verification email
    await sendVerificationEmail(account.email, account.firstName, verifyToken);

    // Create session
    const { browser, os, device, userAgent } = parseUserAgent(req.headers['user-agent']);
    const refreshToken = generateRefreshToken(account._id);
    const refreshExpiry = parseExpiryToMs(process.env.JWT_REFRESH_EXPIRES || '7d');

    const session = await Session.create({
      account: account._id,
      refreshToken,
      userAgent,
      browser,
      os,
      device,
      ip: req.ip,
      expiresAt: new Date(Date.now() + refreshExpiry),
    });

    // Log signup
    await LoginHistory.create({
      account: account._id,
      action: 'signup',
      ip: req.ip,
      userAgent,
      browser,
      os,
      success: true,
    });

    // Generate access token
    const accessToken = generateAccessToken(account._id, session._id);

    // Set refresh token in httpOnly cookie
    res.cookie('graxion_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: refreshExpiry,
      path: '/',
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please verify your email.',
      data: {
        account: {
          id: account._id,
          firstName: account.firstName,
          lastName: account.lastName,
          fullName: account.fullName,
          email: account.email,
          username: account.username,
          avatar: account.avatar,
          isEmailVerified: account.isEmailVerified,
          role: account.role,
        },
        accessToken,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email or username already exists',
      });
    }
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating account',
    });
  }
};

/**
 * @desc    Login to Graxion account
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Find account with password
    const account = await Account.findOne({ email: email.toLowerCase() }).select('+password');
    const { browser, os, device, userAgent } = parseUserAgent(req.headers['user-agent']);

    if (!account) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if account is locked
    if (account.isLocked()) {
      await LoginHistory.create({
        account: account._id,
        action: 'failed_login',
        ip: req.ip,
        userAgent,
        browser,
        os,
        success: false,
        failureReason: 'Account locked',
      });

      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed attempts. Try again later.',
      });
    }

    if (!account.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated',
      });
    }

    if (account.isSuspended) {
      return res.status(403).json({
        success: false,
        message: `Account suspended: ${account.suspendedReason || 'Contact support'}`,
      });
    }

    // Check password
    const isMatch = await account.correctPassword(password);
    if (!isMatch) {
      await account.incLoginAttempts();

      await LoginHistory.create({
        account: account._id,
        action: 'failed_login',
        ip: req.ip,
        userAgent,
        browser,
        os,
        success: false,
        failureReason: 'Invalid password',
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Reset login attempts on successful login
    await account.resetLoginAttempts();

    // Update last login
    account.lastLogin = new Date();
    account.lastLoginIP = req.ip;
    
    if (req.body.product === 'mail') {
      if (!account.linkedProducts) account.linkedProducts = {};
      if (!account.linkedProducts.mail?.linked) {
        account.linkedProducts.mail = { linked: true, linkedAt: new Date() };
      }
    }
    
    await account.save({ validateBeforeSave: false });

    // Create session
    const refreshToken = generateRefreshToken(account._id);
    const refreshExpiry = parseExpiryToMs(process.env.JWT_REFRESH_EXPIRES || '7d');

    const session = await Session.create({
      account: account._id,
      refreshToken,
      userAgent,
      browser,
      os,
      device,
      ip: req.ip,
      expiresAt: new Date(Date.now() + refreshExpiry),
    });

    // Log login
    await LoginHistory.create({
      account: account._id,
      action: 'login',
      ip: req.ip,
      userAgent,
      browser,
      os,
      success: true,
    });

    // Generate access token
    const accessToken = generateAccessToken(account._id, session._id);

    // Set refresh token in httpOnly cookie
    res.cookie('graxion_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: refreshExpiry,
      path: '/',
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        account: {
          id: account._id,
          firstName: account.firstName,
          lastName: account.lastName,
          fullName: account.fullName,
          email: account.email,
          username: account.username,
          avatar: account.avatar,
          isEmailVerified: account.isEmailVerified,
          role: account.role,
          linkedProducts: account.linkedProducts,
          preferences: account.preferences,
        },
        accessToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login',
    });
  }
};

/**
 * @desc    Logout — invalidate current session
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.graxion_refresh_token;

    if (refreshToken) {
      // Mark session as inactive
      await Session.findOneAndUpdate(
        { refreshToken, account: req.account._id },
        { isActive: false }
      );
    }

    // Log logout
    const { browser, os } = parseUserAgent(req.headers['user-agent']);
    await LoginHistory.create({
      account: req.account._id,
      action: 'logout',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      browser,
      os,
      success: true,
    });

    // Clear cookie
    res.clearCookie('graxion_refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during logout',
    });
  }
};

/**
 * @desc    Refresh access token using refresh token
 * @route   POST /api/auth/refresh-token
 * @access  Public (requires refresh token cookie)
 */
export const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.graxion_refresh_token;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token found',
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Check session exists and is active
    const session = await Session.findOne({
      refreshToken,
      account: decoded.id,
      isActive: true,
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session',
      });
    }

    // Check account still exists
    const account = await Account.findById(decoded.id);
    if (!account || !account.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account no longer active',
      });
    }

    // Update session activity
    session.lastActivity = new Date();
    await session.save();

    // Generate new access token
    const accessToken = generateAccessToken(account._id, session._id);

    res.json({
      success: true,
      data: {
        accessToken,
        account: {
          id: account._id,
          firstName: account.firstName,
          lastName: account.lastName,
          fullName: account.fullName,
          email: account.email,
          username: account.username,
          avatar: account.avatar,
          isEmailVerified: account.isEmailVerified,
          role: account.role,
        },
      },
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token. Please login again.',
      });
    }
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Error refreshing token',
    });
  }
};

/**
 * @desc    Verify email address
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 */
export const verifyEmail = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const account = await Account.findOne({
      emailVerifyToken: hashedToken,
      emailVerifyExpires: { $gt: Date.now() },
    });

    if (!account) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token',
      });
    }

    account.isEmailVerified = true;
    account.emailVerifyToken = undefined;
    account.emailVerifyExpires = undefined;
    await account.save({ validateBeforeSave: false });

    // Log verification
    await LoginHistory.create({
      account: account._id,
      action: 'email_verified',
      ip: req.ip,
      success: true,
    });

    // Send welcome email
    await sendWelcomeEmail(account.email, account.firstName);

    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Email verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying email',
    });
  }
};

/**
 * @desc    Resend verification email
 * @route   POST /api/auth/resend-verification
 * @access  Private
 */
export const resendVerification = async (req, res) => {
  try {
    const account = req.account;

    if (account.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified',
      });
    }

    const verifyToken = account.createEmailVerifyToken();
    await account.save({ validateBeforeSave: false });

    await sendVerificationEmail(account.email, account.firstName, verifyToken);

    res.json({
      success: true,
      message: 'Verification email sent',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending verification email',
    });
  }
};

/**
 * @desc    Forgot password — send reset email
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email',
      });
    }

    const account = await Account.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    if (!account) {
      return res.json({
        success: true,
        message: 'If an account with this email exists, a reset link has been sent.',
      });
    }

    const resetToken = account.createPasswordResetToken();
    await account.save({ validateBeforeSave: false });

    await sendPasswordResetEmail(account.email, account.firstName, resetToken);

    res.json({
      success: true,
      message: 'If an account with this email exists, a reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing request',
    });
  }
};

/**
 * @desc    Reset password using token
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 */
export const resetPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;

    if (!password || password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide matching passwords',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters',
      });
    }

    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const account = await Account.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!account) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    account.password = password;
    account.passwordResetToken = undefined;
    account.passwordResetExpires = undefined;
    await account.save();

    // Invalidate all existing sessions
    await Session.updateMany(
      { account: account._id },
      { isActive: false }
    );

    // Log password reset
    await LoginHistory.create({
      account: account._id,
      action: 'password_reset',
      ip: req.ip,
      success: true,
    });

    res.json({
      success: true,
      message: 'Password reset successfully. Please login with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
    });
  }
};

/**
 * @desc    Change password (authenticated)
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new passwords',
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters',
      });
    }

    const account = await Account.findById(req.account._id).select('+password');
    const isMatch = await account.correctPassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    account.password = newPassword;
    await account.save();

    // Log password change
    const { browser, os } = parseUserAgent(req.headers['user-agent']);
    await LoginHistory.create({
      account: account._id,
      action: 'password_change',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      browser,
      os,
      success: true,
    });

    // Generate new tokens
    const accessToken = generateAccessToken(account._id);

    res.json({
      success: true,
      message: 'Password changed successfully',
      data: { accessToken },
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
    });
  }
};

/**
 * @desc    Get current account info
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
  try {
    const account = req.account;

    res.json({
      success: true,
      data: {
        id: account._id,
        firstName: account.firstName,
        lastName: account.lastName,
        fullName: account.fullName,
        email: account.email,
        username: account.username,
        avatar: account.avatar,
        phone: account.phone,
        dateOfBirth: account.dateOfBirth,
        gender: account.gender,
        bio: account.bio,
        address: account.address,
        isEmailVerified: account.isEmailVerified,
        twoFactorEnabled: account.twoFactorEnabled,
        role: account.role,
        linkedProducts: account.linkedProducts,
        preferences: account.preferences,
        lastLogin: account.lastLogin,
        createdAt: account.createdAt,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching account',
    });
  }
};

/**
 * @desc    Generate SSO Token for external Graxion products (e.g. Flow)
 * @route   GET /api/auth/sso-token?service=flow
 * @access  Private
 */
export const generateSsoToken = async (req, res) => {
  try {
    const { service } = req.query;
    if (!service) {
      return res.status(400).json({ success: false, message: 'Service parameter is required' });
    }

    if (!process.env.GRAXION_SSO_SECRET) {
      return res.status(500).json({ success: false, message: 'SSO is not configured on this server' });
    }

    const account = req.account;
    
    // Import jwt specifically for SSO
    const jwt = await import('jsonwebtoken');
    
    const payload = {
      accountId: account._id,
      email: account.email,
      name: account.fullName,
      service: service
    };

    // SSO token is short-lived (1 minute) because it should be consumed immediately
    const ssoToken = jwt.default.sign(payload, process.env.GRAXION_SSO_SECRET, { expiresIn: '1m' });

    res.json({
      success: true,
      data: {
        ssoToken,
        service
      }
    });
  } catch (error) {
    console.error('SSO Token error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating SSO token',
    });
  }
};
