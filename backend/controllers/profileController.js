import Account from '../models/Account.js';
import Session from '../models/Session.js';
import LoginHistory from '../models/LoginHistory.js';
import { uploadToCloudinary, deleteFromCloudinary, getPublicIdFromUrl } from '../utils/cloudinary.js';

/**
 * @desc    Get full profile
 * @route   GET /api/profile
 * @access  Private
 */
export const getProfile = async (req, res) => {
  try {
    const account = await Account.findById(req.account._id);

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
        updatedAt: account.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
    });
  }
};

/**
 * @desc    Update profile info
 * @route   PUT /api/profile
 * @access  Private
 */
export const updateProfile = async (req, res) => {
  try {
    const allowedFields = [
      'firstName', 'lastName', 'phone', 'dateOfBirth',
      'gender', 'bio', 'address', 'username',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // If updating username, validate uniqueness
    if (updates.username) {
      const existingUser = await Account.findOne({
        username: updates.username.toLowerCase(),
        _id: { $ne: req.account._id },
      });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Username is already taken',
        });
      }
    }

    const account = await Account.findByIdAndUpdate(
      req.account._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
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
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists',
      });
    }
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
    });
  }
};

/**
 * @desc    Upload/update avatar
 * @route   POST /api/profile/avatar
 * @access  Private
 */
export const updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file',
      });
    }

    const account = await Account.findById(req.account._id);

    // Delete old avatar if it exists (from Cloudinary)
    if (account.avatar) {
      const oldPublicId = getPublicIdFromUrl(account.avatar);
      if (oldPublicId) {
        await deleteFromCloudinary(oldPublicId);
      } else if (account.avatar.startsWith('uploads/')) {
        // Fallback for old local files if any (though we no longer delete them from disk here)
        console.log('Old local avatar ignored:', account.avatar);
      }
    }

    // Upload new avatar to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file.buffer, 'graxion/avatars');

    // Save new avatar URL
    account.avatar = uploadResult.secure_url;
    await account.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Avatar updated successfully',
      data: {
        avatar: uploadResult.secure_url,
      },
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading avatar',
    });
  }
};

/**
 * @desc    Remove avatar
 * @route   DELETE /api/profile/avatar
 * @access  Private
 */
export const removeAvatar = async (req, res) => {
  try {
    const account = await Account.findById(req.account._id);

    if (account.avatar) {
      const oldPublicId = getPublicIdFromUrl(account.avatar);
      if (oldPublicId) {
        await deleteFromCloudinary(oldPublicId);
      }
      account.avatar = null;
      await account.save({ validateBeforeSave: false });
    }

    res.json({
      success: true,
      message: 'Avatar removed',
    });
  } catch (error) {
    console.error('Remove avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing avatar',
    });
  }
};

/**
 * @desc    Update preferences (theme, language, notifications)
 * @route   PUT /api/profile/preferences
 * @access  Private
 */
export const updatePreferences = async (req, res) => {
  try {
    const { theme, language, notifications } = req.body;
    const updates = {};

    if (theme) updates['preferences.theme'] = theme;
    if (language) updates['preferences.language'] = language;
    if (notifications) {
      if (notifications.email !== undefined) updates['preferences.notifications.email'] = notifications.email;
      if (notifications.push !== undefined) updates['preferences.notifications.push'] = notifications.push;
      if (notifications.sms !== undefined) updates['preferences.notifications.sms'] = notifications.sms;
    }

    const account = await Account.findByIdAndUpdate(
      req.account._id,
      { $set: updates },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Preferences updated',
      data: { preferences: account.preferences },
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating preferences',
    });
  }
};

/**
 * @desc    Get active sessions
 * @route   GET /api/profile/sessions
 * @access  Private
 */
export const getSessions = async (req, res) => {
  try {
    const sessions = await Session.find({
      account: req.account._id,
      isActive: true,
    }).sort({ lastActivity: -1 });

    const currentRefreshToken = req.cookies?.graxion_refresh_token;

    res.json({
      success: true,
      data: sessions.map(s => ({
        id: s._id,
        browser: s.browser,
        os: s.os,
        device: s.device,
        ip: s.ip,
        location: s.location,
        lastActivity: s.lastActivity,
        createdAt: s.createdAt,
        isCurrent: s.refreshToken === currentRefreshToken,
      })),
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sessions',
    });
  }
};

/**
 * @desc    Revoke a specific session
 * @route   DELETE /api/profile/sessions/:sessionId
 * @access  Private
 */
export const revokeSession = async (req, res) => {
  try {
    const session = await Session.findOneAndUpdate(
      { _id: req.params.sessionId, account: req.account._id },
      { isActive: false },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    res.json({
      success: true,
      message: 'Session revoked',
    });
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({
      success: false,
      message: 'Error revoking session',
    });
  }
};

/**
 * @desc    Revoke all sessions except current
 * @route   POST /api/profile/sessions/revoke-all
 * @access  Private
 */
export const revokeAllSessions = async (req, res) => {
  try {
    const currentRefreshToken = req.cookies?.graxion_refresh_token;

    await Session.updateMany(
      {
        account: req.account._id,
        refreshToken: { $ne: currentRefreshToken },
      },
      { isActive: false }
    );

    res.json({
      success: true,
      message: 'All other sessions have been revoked',
    });
  } catch (error) {
    console.error('Revoke all sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error revoking sessions',
    });
  }
};

/**
 * @desc    Get login history
 * @route   GET /api/profile/login-history
 * @access  Private
 */
export const getLoginHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      LoginHistory.find({ account: req.account._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      LoginHistory.countDocuments({ account: req.account._id }),
    ]);

    res.json({
      success: true,
      data: history.map(h => ({
        id: h._id,
        action: h.action,
        ip: h.ip,
        browser: h.browser,
        os: h.os,
        location: h.location,
        success: h.success,
        failureReason: h.failureReason,
        createdAt: h.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get login history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching login history',
    });
  }
};

/**
 * @desc    Get linked products
 * @route   GET /api/profile/linked-products
 * @access  Private
 */
export const getLinkedProducts = async (req, res) => {
  try {
    const account = await Account.findById(req.account._id);

    const products = [
      {
        id: 'graxion',
        name: 'Graxion',
        description: 'Main Platform & Admin',
        icon: '🏠',
        linked: account.linkedProducts.graxion.linked,
        linkedAt: account.linkedProducts.graxion.linkedAt,
        url: process.env.GRAXION_MAIN_URL || 'https://graxion.in',
      },
      {
        id: 'flow',
        name: 'Flow',
        description: 'WhatsApp & Social Media Automation',
        icon: '⚡',
        linked: account.linkedProducts.flow.linked,
        linkedAt: account.linkedProducts.flow.linkedAt,
        url: process.env.FLOW_URL || 'https://flow.graxion.in',
      },
      {
        id: 'ai',
        name: 'AI',
        description: 'AI Assistant & Chat',
        icon: '🤖',
        linked: account.linkedProducts.ai.linked,
        linkedAt: account.linkedProducts.ai.linkedAt,
        url: process.env.AI_URL || 'https://ai.graxion.in',
      },
      {
        id: 'mail',
        name: 'Mail',
        description: 'Email Service',
        icon: '✉️',
        linked: account.linkedProducts.mail.linked,
        linkedAt: account.linkedProducts.mail.linkedAt,
        url: process.env.MAIL_URL || 'https://mail.graxion.in',
      },
    ];

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('Get linked products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching linked products',
    });
  }
};

/**
 * @desc    Link a product to the account
 * @route   POST /api/profile/link-product
 * @access  Private
 */
export const linkProduct = async (req, res) => {
  try {
    const { product } = req.body;
    
    if (!product || !['mail', 'flow', 'ai'].includes(product)) {
      return res.status(400).json({ success: false, message: 'Invalid product' });
    }

    const account = await Account.findById(req.account._id);
    
    if (!account.linkedProducts) account.linkedProducts = {};
    if (!account.linkedProducts[product]) account.linkedProducts[product] = {};
    
    account.linkedProducts[product].linked = true;
    account.linkedProducts[product].linkedAt = new Date();
    
    await account.save();
    
    res.json({ success: true, message: `${product} linked successfully`, data: account.linkedProducts });
  } catch (error) {
    console.error('Link product error:', error);
    res.status(500).json({ success: false, message: 'Error linking product' });
  }
};

/**
 * @desc    Soft delete account
 * @route   DELETE /api/profile
 * @access  Private
 */
export const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your password to confirm deletion',
      });
    }

    const account = await Account.findById(req.account._id).select('+password');
    const isMatch = await account.correctPassword(password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect password',
      });
    }

    // Soft delete
    account.isActive = false;
    await account.save({ validateBeforeSave: false });

    // Invalidate all sessions
    await Session.updateMany(
      { account: account._id },
      { isActive: false }
    );

    // Clear cookie
    res.clearCookie('graxion_refresh_token');

    res.json({
      success: true,
      message: 'Account deactivated. It will be permanently deleted in 30 days.',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting account',
    });
  }
};
