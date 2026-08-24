import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { getPlans, createOrder, verifyPayment } from '../controllers/billingController.js';

const router = express.Router();

router.get('/plans', getPlans);
router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);

export default router;
