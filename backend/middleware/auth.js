import Account from '../models/Account.js';
import Session from '../models/Session.js';
import { verifyAccessToken, parseUserAgent } from '../utils/tokenUtils.js';

/**
 * Protect routes — verify JWT access token
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check cookies
    else if (req.cookies?.graxion_access_token) {
      token = req.cookies.graxion_access_token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — no token provided',
      });
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Check account exists and is active
    const account = await Account.findById(decoded.id);
    if (!account) {
      return res.status(401).json({
        success: false,
        message: 'Account no longer exists',
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

    // Check if session is still active
    if (decoded.sessionId) {
      const session = await Session.findById(decoded.sessionId);
      if (!session || !session.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Session has been revoked or expired',
        });
      }
    }

    req.account = account;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Token has expired. Please refresh.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};

/**
 * Restrict to specific roles
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.account.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
      });
    }
    next();
  };
};

/**
 * Optional auth — attach account if token exists, but don't block
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.graxion_access_token) {
      token = req.cookies.graxion_access_token;
    }

    if (token) {
      const decoded = verifyAccessToken(token);
      const account = await Account.findById(decoded.id);
      
      let sessionValid = true;
      if (decoded.sessionId) {
        const session = await Session.findById(decoded.sessionId);
        if (!session || !session.isActive) sessionValid = false;
      }

      if (account && account.isActive && sessionValid) {
        req.account = account;
      }
    }
  } catch {
    // Silently fail — optional auth
  }
  next();
};
