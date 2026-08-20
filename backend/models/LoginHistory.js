import mongoose from 'mongoose';

const loginHistorySchema = new mongoose.Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
    index: true,
  },
  action: {
    type: String,
    enum: ['login', 'logout', 'signup', 'password_change', 'password_reset', 'email_verified', 'failed_login', 'account_locked'],
    required: true,
  },
  ip: {
    type: String,
    default: null,
  },
  userAgent: {
    type: String,
    default: 'Unknown',
  },
  browser: {
    type: String,
    default: 'Unknown',
  },
  os: {
    type: String,
    default: 'Unknown',
  },
  location: {
    type: String,
    default: null,
  },
  success: {
    type: Boolean,
    default: true,
  },
  failureReason: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// Auto-delete records older than 90 days
loginHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
loginHistorySchema.index({ account: 1, createdAt: -1 });

const LoginHistory = mongoose.model('LoginHistory', loginHistorySchema);

export default LoginHistory;
