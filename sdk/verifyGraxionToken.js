/**
 * Graxion Auth SDK — Token Verification Utility
 * 
 * Import this in any Graxion product (Flow, AI, Mail) to verify
 * Graxion Account JWT tokens.
 * 
 * Usage:
 *   import { verifyGraxionToken, graxionAuthMiddleware } from '../path/to/verifyGraxionToken.js';
 * 
 *   // As middleware
 *   app.use('/api/protected', graxionAuthMiddleware);
 * 
 *   // As a function
 *   const decoded = verifyGraxionToken(token);
 */

import jwt from 'jsonwebtoken';

// The shared JWT secret — must match Auth service's JWT_SECRET
const GRAXION_AUTH_SECRET = process.env.GRAXION_AUTH_JWT_SECRET || process.env.JWT_SECRET;

/**
 * Verify a Graxion Account JWT access token
 * @param {string} token — JWT access token
 * @returns {object} decoded payload { id, type, iat, exp }
 * @throws {Error} if token is invalid or expired
 */
export const verifyGraxionToken = (token) => {
  if (!GRAXION_AUTH_SECRET) {
    throw new Error('GRAXION_AUTH_JWT_SECRET or JWT_SECRET environment variable is not set');
  }
  return jwt.verify(token, GRAXION_AUTH_SECRET);
};

/**
 * Express middleware to protect routes using Graxion Account tokens
 * Attaches decoded token payload to req.graxionAccount
 */
export const graxionAuthMiddleware = (req, res, next) => {
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
        message: 'Graxion authentication required',
      });
    }

    const decoded = verifyGraxionToken(token);
    req.graxionAccount = decoded; // { id, type, iat, exp }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        code: 'GRAXION_TOKEN_EXPIRED',
        message: 'Graxion session expired. Please refresh.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid Graxion authentication token',
    });
  }
};

export default { verifyGraxionToken, graxionAuthMiddleware };
