import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Shield, Monitor, Clock, Package, LogOut,
  Save, Camera, Trash2, X, AlertTriangle, CheckCircle,
  ChevronRight, Smartphone, Laptop, Tablet, Globe,
  Lock, Eye, EyeOff, AlertCircle, RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { profileAPI, authAPI } from '../utils/api';
import toast, { Toaster } from 'react-hot-toast';
import '../App.css';

const TABS = [
  { id: 'personal', label: 'Personal Info', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'sessions', label: 'Sessions', icon: Monitor },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'history', label: 'Activity', icon: Clock },
];

export default function Profile() {
  const { account, logout, updateAccount } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('personal');

  if (!account) {
    navigate('/login');
    return null;
  }

  return (
    <div className="profile-layout">
      <Toaster
        position="top-right"
        toastOptions={{ className: 'toast-custom', duration: 3000 }}
      />

      {/* Navbar */}
      <nav className="profile-navbar">
        <a href="/" className="nav-brand">
          <div className="brand-icon">G</div>
          <span className="brand-text">Graxion<span className="brand-sub">Accounts</span></span>
        </a>
        <div className="nav-user">
          <div className="user-avatar" title={account.fullName || account.email}>
            {account.avatar ? (
              <img src={`/${account.avatar}`} alt="Avatar" />
            ) : (
              (account.firstName?.[0] || 'U').toUpperCase()
            )}
          </div>
          <button className="btn-logout" onClick={logout}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="profile-content">
        <div className="profile-header">
          <h1>Account Settings</h1>
          <p>Manage your Graxion account, security, and linked products</p>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={15} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'personal' && <PersonalInfoTab account={account} updateAccount={updateAccount} />}
        {activeTab === 'security' && <SecurityTab />}
        {activeTab === 'sessions' && <SessionsTab />}
        {activeTab === 'products' && <ProductsTab />}
        {activeTab === 'history' && <HistoryTab />}
      </div>
    </div>
  );
}

/* ── Personal Info Tab ── */
function PersonalInfoTab({ account, updateAccount }) {
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    firstName: account.firstName || '',
    lastName: account.lastName || '',
    username: account.username || '',
    phone: account.phone || '',
    dateOfBirth: account.dateOfBirth ? account.dateOfBirth.split('T')[0] : '',
    gender: account.gender || '',
    bio: account.bio || '',
    address: {
      street: account.address?.street || '',
      city: account.address?.city || '',
      state: account.address?.state || '',
      country: account.address?.country || '',
      zipCode: account.address?.zipCode || '',
    },
  });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [field]: value },
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await profileAPI.updateProfile(formData);
      updateAccount(data.data);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploadingAvatar(true);
    const fd = new FormData();
    fd.append('avatar', file);

    try {
      const { data } = await profileAPI.uploadAvatar(fd);
      updateAccount({ avatar: data.data.avatar });
      toast.success('Avatar updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await profileAPI.removeAvatar();
      updateAccount({ avatar: null });
      toast.success('Avatar removed');
    } catch {
      toast.error('Failed to remove avatar');
    }
  };

  return (
    <>
      {/* Avatar Section */}
      <div className="section-card">
        <div className="section-title">
          <Camera size={18} className="title-icon" /> Profile Photo
        </div>
        <div className="avatar-section">
          <div className="avatar-preview">
            {account.avatar ? (
              <img src={`/${account.avatar}`} alt="Avatar" />
            ) : (
              (account.firstName?.[0] || 'U').toUpperCase()
            )}
          </div>
          <div className="avatar-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={handleAvatarUpload}
            />
            <button
              className="btn-upload"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? 'Uploading...' : 'Upload new photo'}
            </button>
            {account.avatar && (
              <button className="btn-remove" onClick={handleRemoveAvatar}>
                Remove photo
              </button>
            )}
            <span className="avatar-hint">JPG, PNG, WebP or GIF. Max 5MB.</span>
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <div className="section-card">
        <div className="section-title">
          <User size={18} className="title-icon" /> Personal Information
        </div>
        <form onSubmit={handleSave}>
          <div className="form-grid">
            <div className="form-group">
              <label>First Name</label>
              <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Username</label>
              <input type="text" name="username" value={formData.username} onChange={handleChange} placeholder="@username" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={account.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 12345 67890" />
            </div>
            <div className="form-group">
              <label>Date of Birth</label>
              <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange}>
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
            <div className="form-group full-width">
              <label>Bio</label>
              <textarea name="bio" value={formData.bio} onChange={handleChange} placeholder="Tell us about yourself..." rows={3} />
            </div>
          </div>

          {/* Address */}
          <div style={{ marginTop: 'var(--space-lg)' }}>
            <div className="section-title" style={{ fontSize: '0.875rem' }}>
              <Globe size={16} className="title-icon" /> Address
            </div>
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Street</label>
                <input type="text" name="address.street" value={formData.address.street} onChange={handleChange} placeholder="123 Main Street" />
              </div>
              <div className="form-group">
                <label>City</label>
                <input type="text" name="address.city" value={formData.address.city} onChange={handleChange} placeholder="Mumbai" />
              </div>
              <div className="form-group">
                <label>State</label>
                <input type="text" name="address.state" value={formData.address.state} onChange={handleChange} placeholder="Maharashtra" />
              </div>
              <div className="form-group">
                <label>Country</label>
                <input type="text" name="address.country" value={formData.address.country} onChange={handleChange} placeholder="India" />
              </div>
              <div className="form-group">
                <label>ZIP Code</label>
                <input type="text" name="address.zipCode" value={formData.address.zipCode} onChange={handleChange} placeholder="400001" />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <Save size={16} />}
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

/* ── Security Tab ── */
function SecurityTab() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState('');

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setChanging(true);
    setError('');

    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setError('New passwords do not match');
      setChanging(false);
      return;
    }

    try {
      await authAPI.changePassword(passwordData);
      toast.success('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChanging(false);
    }
  };

  return (
    <>
      <div className="section-card">
        <div className="section-title">
          <Lock size={18} className="title-icon" /> Change Password
        </div>
        <div className="section-desc">Ensure your account stays secure by updating your password regularly.</div>

        {error && (
          <div className="error-message" style={{ marginBottom: 'var(--space-md)' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handlePasswordChange}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Current Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(p => ({ ...p, currentPassword: e.target.value }))}
                  required
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(p => ({ ...p, newPassword: e.target.value }))}
                  required
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={passwordData.confirmNewPassword}
                onChange={(e) => setPasswordData(p => ({ ...p, confirmNewPassword: e.target.value }))}
                required
                placeholder="Re-enter new password"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-save" disabled={changing}>
              {changing ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <Shield size={16} />}
              {changing ? 'Updating...' : 'Update password'}
            </button>
          </div>
        </form>
      </div>

      {/* Email Verification Status */}
      <div className="section-card">
        <div className="section-title">
          <CheckCircle size={18} className="title-icon" /> Email Verification
        </div>
        <EmailVerificationSection />
      </div>

      {/* Danger Zone */}
      <div className="section-card" style={{ borderColor: 'rgba(239, 68, 68, 0.15)' }}>
        <div className="section-title" style={{ color: 'var(--error)' }}>
          <AlertTriangle size={18} /> Danger Zone
        </div>
        <div className="section-desc">Once you delete your account, there is no going back. Please be certain.</div>
        <DeleteAccountSection />
      </div>
    </>
  );
}

function EmailVerificationSection() {
  const { account } = useAuth();
  const [sending, setSending] = useState(false);

  const handleResend = async () => {
    setSending(true);
    try {
      await authAPI.resendVerification();
      toast.success('Verification email sent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send verification email');
    } finally {
      setSending(false);
    }
  };

  if (account.isEmailVerified) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontSize: '0.875rem' }}>
        <CheckCircle size={16} /> Your email is verified
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning)', fontSize: '0.875rem', marginBottom: 'var(--space-md)' }}>
        <AlertTriangle size={16} /> Your email is not verified yet
      </div>
      <button className="btn-secondary" onClick={handleResend} disabled={sending} style={{ width: 'auto' }}>
        {sending ? 'Sending...' : 'Resend verification email'}
      </button>
    </div>
  );
}

function DeleteAccountSection() {
  const { logout } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await profileAPI.deleteAccount({ password });
      toast.success('Account deactivated');
      logout();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  if (!showConfirm) {
    return (
      <button className="btn-danger" onClick={() => setShowConfirm(true)} style={{ width: 'auto' }}>
        <Trash2 size={16} style={{ display: 'inline', marginRight: 6 }} />
        Delete my account
      </button>
    );
  }

  return (
    <div style={{ background: 'var(--error-bg)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
        Enter your password to confirm account deletion:
      </p>
      <input
        type="password"
        placeholder="Your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ marginBottom: 'var(--space-md)', width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'var(--font-family)', fontSize: '0.875rem' }}
      />
      <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
        <button className="btn-danger" onClick={handleDelete} disabled={deleting || !password} style={{ width: 'auto' }}>
          {deleting ? 'Deleting...' : 'Confirm Delete'}
        </button>
        <button className="btn-secondary" onClick={() => { setShowConfirm(false); setPassword(''); }} style={{ width: 'auto' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Sessions Tab ── */
function SessionsTab() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data } = await profileAPI.getSessions();
      setSessions(data.data);
    } catch {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (sessionId) => {
    try {
      await profileAPI.revokeSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success('Session revoked');
    } catch {
      toast.error('Failed to revoke session');
    }
  };

  const handleRevokeAll = async () => {
    try {
      await profileAPI.revokeAllSessions();
      setSessions(prev => prev.filter(s => s.isCurrent));
      toast.success('All other sessions revoked');
    } catch {
      toast.error('Failed to revoke sessions');
    }
  };

  const getDeviceIcon = (device) => {
    switch (device) {
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      default: return Laptop;
    }
  };

  const formatTime = (date) => {
    if (!date) return 'Unknown';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="section-card">
      <div className="section-title" style={{ justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <Monitor size={18} className="title-icon" /> Active Sessions
        </span>
        {sessions.length > 1 && (
          <button className="btn-danger" onClick={handleRevokeAll} style={{ width: 'auto', padding: '6px 14px', fontSize: '0.75rem' }}>
            Logout all others
          </button>
        )}
      </div>
      <div className="section-desc">Devices where your account is currently logged in.</div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
          <RefreshCw size={20} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div className="sessions-list">
          {sessions.map(session => {
            const DeviceIcon = getDeviceIcon(session.device);
            return (
              <div key={session.id} className={`session-item ${session.isCurrent ? 'current' : ''}`}>
                <div className="session-info">
                  <div className="session-icon">
                    <DeviceIcon size={20} />
                  </div>
                  <div className="session-details">
                    <h4>
                      {session.browser} on {session.os}
                      {session.isCurrent && <span className="current-badge">This device</span>}
                    </h4>
                    <p>{session.ip || 'Unknown IP'} · {formatTime(session.lastActivity)}</p>
                  </div>
                </div>
                {!session.isCurrent && (
                  <button className="btn-revoke" onClick={() => handleRevoke(session.id)}>
                    Revoke
                  </button>
                )}
              </div>
            );
          })}
          {sessions.length === 0 && (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-lg)' }}>
              No active sessions found
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Products Tab ── */
function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await profileAPI.getLinkedProducts();
      setProducts(data.data);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section-card">
      <div className="section-title">
        <Package size={18} className="title-icon" /> Graxion Products
      </div>
      <div className="section-desc">Products linked to your Graxion Account. One account for the entire ecosystem.</div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>Loading...</div>
      ) : (
        <div className="products-grid">
          {products.map(product => (
            <a
              key={product.id}
              href={product.url !== '#' ? product.url : undefined}
              className="product-card"
              target={product.url !== '#' ? '_blank' : undefined}
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <div className="product-icon">{product.icon}</div>
              <div className="product-name">{product.name}</div>
              <div className="product-desc">{product.description}</div>
              <div className={`product-status ${product.linked ? 'linked' : 'unlinked'}`}>
                {product.linked ? (
                  <><CheckCircle size={12} /> Linked</>
                ) : (
                  'Not linked'
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── History Tab ── */
function HistoryTab() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, [page]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data } = await profileAPI.getLoginHistory(page);
      setHistory(data.data);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load activity history');
    } finally {
      setLoading(false);
    }
  };

  const getActionConfig = (action, success) => {
    if (!success) return { icon: X, label: 'Failed Login', iconClass: 'failed' };

    const configs = {
      login: { icon: CheckCircle, label: 'Signed in', iconClass: 'success' },
      logout: { icon: LogOut, label: 'Signed out', iconClass: 'info' },
      signup: { icon: User, label: 'Account created', iconClass: 'success' },
      password_change: { icon: Shield, label: 'Password changed', iconClass: 'info' },
      password_reset: { icon: Lock, label: 'Password reset', iconClass: 'info' },
      email_verified: { icon: CheckCircle, label: 'Email verified', iconClass: 'success' },
      failed_login: { icon: AlertTriangle, label: 'Failed login attempt', iconClass: 'failed' },
      account_locked: { icon: Lock, label: 'Account locked', iconClass: 'failed' },
    };

    return configs[action] || { icon: Clock, label: action, iconClass: 'info' };
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="section-card">
      <div className="section-title">
        <Clock size={18} className="title-icon" /> Activity History
      </div>
      <div className="section-desc">Recent security events on your account (last 90 days).</div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>Loading...</div>
      ) : (
        <>
          <div className="history-list">
            {history.map(item => {
              const config = getActionConfig(item.action, item.success);
              const Icon = config.icon;
              return (
                <div key={item.id} className="history-item">
                  <div className={`history-icon ${config.iconClass}`}>
                    <Icon size={16} />
                  </div>
                  <div className="history-details">
                    <h4>{config.label}</h4>
                    <p>
                      {item.browser} · {item.os}
                      {item.ip && ` · ${item.ip}`}
                      {item.failureReason && ` · ${item.failureReason}`}
                    </p>
                  </div>
                  <span className="history-time">{formatDate(item.createdAt)}</span>
                </div>
              );
            })}
            {history.length === 0 && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-lg)' }}>
                No activity history yet
              </p>
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              <button
                className="btn-secondary"
                onClick={() => setPage(p => p - 1)}
                disabled={page <= 1}
                style={{ width: 'auto', padding: '8px 16px' }}
              >
                Previous
              </button>
              <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                Page {page} of {pagination.totalPages}
              </span>
              <button
                className="btn-secondary"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= pagination.totalPages}
                style={{ width: 'auto', padding: '8px 16px' }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
