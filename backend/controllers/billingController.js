import Razorpay from 'razorpay';
import crypto from 'crypto';
import Account from '../models/Account.js';
import Plan from '../models/Plan.js';
import Payment from '../models/Payment.js';

const getRazorpayInstance = () => {
  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  if (!keyId || !keySecret || keyId === 'dummy') {
    return null;
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

export const getPlans = async (req, res) => {
  try {
    let plans = await Plan.find({ isActive: true }).sort({ price: 1 });
    
    // Auto-seed plans if DB is empty
    if (plans.length === 0) {
      const defaultPlans = [
        { name: 'Free', code: 'free', price: 0, credits: 100, messageLimit: 100, agentLimit: 1 },
        { name: 'Starter', code: 'starter', price: 999, credits: 1000, messageLimit: 5000, agentLimit: 3 },
        { name: 'Pro', code: 'pro', price: 2999, credits: 5000, messageLimit: 20000, agentLimit: 10 }
      ];
      await Plan.insertMany(defaultPlans);
      plans = await Plan.find({ isActive: true }).sort({ price: 1 });
    }

    res.json({ success: true, data: plans });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch plans' });
  }
};

export const createOrder = async (req, res) => {
  try {
    const { planId, billingCycle } = req.body;
    const account = req.account;

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    let amount = plan.price;
    if (billingCycle === 'yearly') {
      amount = amount * 12 * 0.8; // 20% discount for yearly
    }

    if (amount === 0) {
      // Free plan change
      account.subscription = {
        ...account.subscription,
        plan: plan.code,
        status: 'active',
        messageLimit: plan.messageLimit,
        agentLimit: plan.agentLimit,
        credits: plan.credits,
        totalCredits: plan.credits,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 100)), // Never expires
      };
      await account.save();
      return res.json({ success: true, message: 'Switched to Free Plan successfully', data: { isFree: true } });
    }

    const razorpay = getRazorpayInstance();
    if (!razorpay) {
      return res.status(500).json({ success: false, message: 'Payment gateway not configured' });
    }

    const amountInPaise = Math.round(amount * 100);
    
    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_${account._id}_${Date.now()}`.substring(0, 40),
      notes: {
        accountId: account._id.toString(),
        planId: plan._id.toString(),
        planCode: plan.code,
        billingCycle
      }
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID
      }
    });

  } catch (error) {
    console.error('Create Order Error:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment order' });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, billingCycle } = req.body;
    const account = req.account;

    const secret = process.env.RAZORPAY_KEY_SECRET;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    let amount = plan.price;
    if (billingCycle === 'yearly') {
      amount = amount * 12 * 0.8;
    }

    // Record Payment
    await Payment.create({
      user: account._id,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      amount: amount,
      currency: 'INR',
      status: 'completed',
      paymentMethod: 'razorpay',
      plan: plan._id,
      billingCycle,
    });

    // Update Subscription
    const endDate = new Date();
    if (billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    account.subscription = {
      ...account.subscription,
      plan: plan.code,
      status: 'active',
      messageLimit: plan.messageLimit,
      agentLimit: plan.agentLimit,
      credits: account.subscription.credits + plan.credits,
      totalCredits: plan.credits,
      currentPeriodStart: new Date(),
      currentPeriodEnd: endDate,
    };
    
    await account.save();

    res.json({ success: true, message: 'Payment successful and subscription updated' });

  } catch (error) {
    console.error('Verify Payment Error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify payment' });
  }
};
