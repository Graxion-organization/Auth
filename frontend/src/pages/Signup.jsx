import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, AlertCircle, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';
import '../App.css';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect_to');
  const product = searchParams.get('product');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    setError('');
  };

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    const pw = formData.password;
    if (!pw) return { score: 0, label: '' };

    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    return { score, label: labels[score] || 'Weak' };
  }, [formData.password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    if (!formData.agreeTerms) {
      setError('Please agree to the Terms of Service');
      setLoading(false);
      return;
    }

    try {
      await signup({ ...formData, product });
      if (redirectTo) {
        let token = localStorage.getItem('graxion_access_token');
        if (product) {
          try {
            const { data } = await authAPI.getSsoToken(product);
            if (data?.data?.ssoToken) {
              token = data.data.ssoToken;
            }
          } catch (e) {
            console.error('Failed to fetch SSO token', e);
          }
        }
        const sep = redirectTo.includes('?') ? '&' : '?';
        window.location.href = token ? `${redirectTo}${sep}token=${token}` : redirectTo;
      } else {
        navigate('/profile');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="logo-section">
          <div className="logo-icon">G</div>
          <h1>Create your account</h1>
          <p>Join the Graxion ecosystem</p>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="signup-first-name">First name</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="signup-first-name"
                  name="firstName"
                  className="has-icon"
                  placeholder="Yogesh"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  autoComplete="given-name"
                />
                <User size={18} className="input-icon" />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="signup-last-name">Last name</label>
              <input
                type="text"
                id="signup-last-name"
                name="lastName"
                placeholder="Kaushik"
                value={formData.lastName}
                onChange={handleChange}
                required
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="signup-email">Email address</label>
            <div className="input-wrapper">
              <input
                type="email"
                id="signup-email"
                name="email"
                className="has-icon"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
              <Mail size={18} className="input-icon" />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="signup-password">Password</label>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="signup-password"
                name="password"
                className="has-icon"
                placeholder="Min. 8 characters"
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
              <Lock size={18} className="input-icon" />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {formData.password && (
              <div className="password-strength">
                <div className="strength-bar">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className={`bar ${i <= passwordStrength.score ? 'active' : ''} ${
                        passwordStrength.score >= 4 ? 'strong' : passwordStrength.score >= 3 ? 'medium' : ''
                      }`}
                    />
                  ))}
                </div>
                <span className="strength-text">{passwordStrength.label}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="signup-confirm-password">Confirm password</label>
            <div className="input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="signup-confirm-password"
                name="confirmPassword"
                className="has-icon"
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
              <Lock size={18} className="input-icon" />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {formData.confirmPassword && formData.password === formData.confirmPassword && (
              <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '0.75rem' }}>
                <Check size={14} /> Passwords match
              </div>
            )}
          </div>

          <div className="auth-extras" style={{ justifyContent: 'flex-start' }}>
            <label>
              <input
                type="checkbox"
                className="checkbox-custom"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleChange}
              />
              I agree to the <a href="https://graxion.in/terms" target="_blank" rel="noopener noreferrer" style={{ marginLeft: '4px' }}>Terms of Service</a>
            </label>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <div className="spinner" /> : (
              <>
                Create account <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to={`/login${searchParams.toString() ? `?${searchParams.toString()}` : ''}`}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
