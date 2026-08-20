import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { authAPI } from '../utils/api';
import '../App.css';

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) {
      verifyEmail();
    }
  }, [token]);

  const verifyEmail = async () => {
    try {
      const { data } = await authAPI.verifyEmail(token);
      setStatus('success');
      setMessage(data.message);
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Invalid or expired verification link');
    }
  };

  const statusConfig = {
    loading: {
      icon: <Loader2 size={28} className="spin" />,
      title: 'Verifying your email...',
      desc: 'Please wait while we verify your email address.',
      iconClass: 'loading',
    },
    success: {
      icon: <CheckCircle size={28} />,
      title: 'Email verified! ✨',
      desc: message || 'Your email has been verified successfully. You can now access all Graxion features.',
      iconClass: 'success',
    },
    error: {
      icon: <XCircle size={28} />,
      title: 'Verification failed',
      desc: message || 'The verification link is invalid or has expired.',
      iconClass: 'error',
    },
  };

  const config = statusConfig[status];

  return (
    <div className="verify-layout">
      <style>{`.spin { animation: spin 1s linear infinite; }`}</style>
      <div className="verify-card">
        <div className={`verify-icon ${config.iconClass}`}>
          {config.icon}
        </div>
        <h2>{config.title}</h2>
        <p>{config.desc}</p>

        {status === 'success' && (
          <Link to="/profile" className="btn-primary" style={{ display: 'inline-flex', textDecoration: 'none' }}>
            Go to Dashboard <ArrowRight size={18} />
          </Link>
        )}

        {status === 'error' && (
          <Link to="/login" className="btn-secondary" style={{ display: 'inline-flex', textDecoration: 'none' }}>
            Back to sign in
          </Link>
        )}
      </div>
    </div>
  );
}
