import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, ArrowLeft, CheckCircle, Send } from 'lucide-react';
import { authAPI } from '../utils/api';
import '../App.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authAPI.forgotPassword({ email });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-layout">
        <div className="auth-card">
          <div className="logo-section">
            <div className="logo-icon" style={{ background: 'var(--success-bg)' }}>
              <CheckCircle size={24} color="var(--success)" />
            </div>
            <h1>Check your email</h1>
            <p>We've sent a password reset link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong></p>
          </div>

          <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
            Didn't receive the email? Check your spam folder or try again with a different email address.
          </div>

          <button className="btn-secondary" onClick={() => { setSuccess(false); setEmail(''); }}>
            <Send size={16} /> Try another email
          </button>

          <div className="auth-footer">
            <Link to="/login"><ArrowLeft size={14} style={{ display: 'inline' }} /> Back to sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="logo-section">
          <div className="logo-icon">G</div>
          <h1>Forgot password?</h1>
          <p>Enter your email and we'll send you a reset link</p>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="forgot-email">Email address</label>
            <div className="input-wrapper">
              <input
                type="email"
                id="forgot-email"
                className="has-icon"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                required
                autoComplete="email"
              />
              <Mail size={18} className="input-icon" />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 'var(--space-md)' }}>
            {loading ? <div className="spinner" /> : (
              <>
                Send reset link <Send size={16} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login"><ArrowLeft size={14} style={{ display: 'inline' }} /> Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
