import express from 'express';
import {
  getProfile,
  updateProfile,
  updateAvatar,
  removeAvatar,
  updatePreferences,
  getSessions,
  revokeSession,
  revokeAllSessions,
  getLoginHistory,
  getLinkedProducts,
  linkProduct,
  deleteAccount,
} from '../controllers/profileController.js';
import { protect } from '../middleware/auth.js';
import { uploadAvatar } from '../middleware/upload.js';

const router = express.Router();

// All profile routes are protected
router.use(protect);

// Profile CRUD
router.get('/', getProfile);
router.put('/', updateProfile);
router.delete('/', deleteAccount);

// Avatar
router.post('/avatar', uploadAvatar.single('avatar'), updateAvatar);
router.delete('/avatar', removeAvatar);

// Preferences
router.put('/preferences', updatePreferences);

// Sessions
router.get('/sessions', getSessions);
router.delete('/sessions/:sessionId', revokeSession);
router.post('/sessions/revoke-all', revokeAllSessions);

// Login History
router.get('/login-history', getLoginHistory);

// Linked Products
router.get('/linked-products', getLinkedProducts);
router.post('/link-product', linkProduct);

export default router;
