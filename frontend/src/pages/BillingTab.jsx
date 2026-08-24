import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';

export default function BillingTab({ account }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly'); // monthly or yearly

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      // Create billingAPI in utils/api.js or just use authAPI
      const { data } = await authAPI.getPlans();
      setPlans(data.data);
    } catch (err) {
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async (plan) => {
    if (plan.price === 0) {
      toast.error("You are already on the free plan or cannot switch to it this way.");
      return;
    }

    setProcessing(true);
    try {
      const res = await loadRazorpay();
      if (!res) {
        toast.error('Razorpay SDK failed to load');
        setProcessing(false);
        return;
      }

      // Create Order
      const orderRes = await authAPI.createOrder({ planId: plan._id, billingCycle });
      const { orderId, amount, currency, key } = orderRes.data.data;

      const options = {
        key,
        amount,
        currency,
        name: 'Graxion Ecosystem',
        description: `Subscription to ${plan.name} (${billingCycle})`,
        order_id: orderId,
        handler: async function (response) {
          try {
            toast.loading('Verifying payment...', { id: 'payment' });
            await authAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: plan._id,
              billingCycle,
            });
            toast.success('Payment successful! Subscription activated.', { id: 'payment' });
            window.location.reload();
          } catch (err) {
            toast.error('Payment verification failed', { id: 'payment' });
          }
        },
        prefill: {
          name: account.fullName,
          email: account.email,
          contact: account.phone || '',
        },
        theme: {
          color: '#FF6A00',
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      toast.error('Failed to initiate checkout');
    } finally {
      setProcessing(false);
    }
  };

  const currentPlan = account.subscription?.plan || 'free';
  const isActive = account.subscription?.status === 'active';

  return (
    <div className="section-card">
      <div className="section-title">
        <CreditCard size={18} className="title-icon" /> Billing & Subscription
      </div>
      <div className="section-desc">Manage your centralized Graxion billing and subscription plans. This grants you access to Flow, Mail, and AI limits.</div>

      {/* Current Subscription Status */}
      <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', marginTop: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>Current Plan</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
              {currentPlan} Plan
            </div>
            <div style={{ color: isActive ? 'var(--success)' : 'var(--error)', fontSize: '0.875rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              {isActive ? <CheckCircle size={14} /> : <AlertTriangle size={14} />} 
              {isActive ? 'Active Subscription' : 'Inactive Subscription'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Limits</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
              {account.subscription?.messageLimit} Messages / {account.subscription?.totalCredits} AI Credits
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: 'var(--space-xl)' }}>
        <button 
          onClick={() => setBillingCycle('monthly')}
          style={{ padding: '8px 16px', borderRadius: '20px', background: billingCycle === 'monthly' ? 'var(--brand-primary)' : 'var(--bg-secondary)', color: billingCycle === 'monthly' ? 'white' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontWeight: 600 }}
        >
          Monthly
        </button>
        <button 
          onClick={() => setBillingCycle('yearly')}
          style={{ padding: '8px 16px', borderRadius: '20px', background: billingCycle === 'yearly' ? 'var(--brand-primary)' : 'var(--bg-secondary)', color: billingCycle === 'yearly' ? 'white' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontWeight: 600 }}
        >
          Yearly (Save 20%)
        </button>
      </div>

      {/* Pricing Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>Loading plans...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-lg)' }}>
          {plans.map((plan) => {
            const isCurrent = plan.code === currentPlan;
            const price = billingCycle === 'yearly' ? (plan.price * 12 * 0.8) : plan.price;
            
            return (
              <div key={plan._id} style={{ border: isCurrent ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', background: 'var(--bg-card)', position: 'relative' }}>
                {isCurrent && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--brand-primary)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    CURRENT PLAN
                  </div>
                )}
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: 'var(--space-sm)' }}>{plan.name}</h3>
                <div style={{ fontSize: '2rem', fontWeight: '800', marginBottom: 'var(--space-md)' }}>
                  ₹{price} <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>/{billingCycle === 'yearly' ? 'year' : 'mo'}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 var(--space-xl) 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <li style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}><Zap size={14} color="var(--brand-primary)"/> {plan.messageLimit} Messages</li>
                  <li style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}><Zap size={14} color="var(--brand-primary)"/> {plan.credits} AI Credits</li>
                  <li style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}><Zap size={14} color="var(--brand-primary)"/> {plan.agentLimit} AI Agents</li>
                </ul>
                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={isCurrent || processing}
                  style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: 'none', background: isCurrent ? 'var(--bg-secondary)' : 'var(--brand-primary)', color: isCurrent ? 'var(--text-muted)' : 'white', fontWeight: 'bold', cursor: isCurrent || processing ? 'not-allowed' : 'pointer' }}
                >
                  {isCurrent ? 'Active' : processing ? 'Processing...' : 'Subscribe'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
