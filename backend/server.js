import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';

// Load env vars
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Connect to MongoDB
connectDB();

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Dynamic CORS matching
    const isLocalhost = /^http:\/\/localhost:\d+$/.test(origin);
    const isGraxion = /\.graxion\.in$/.test(origin) || origin === 'https://graxion.in';
    const isVercel = /\.vercel\.app$/.test(origin);
    
    if (isLocalhost || isGraxion || isVercel) {
      callback(null, true);
    } else {
      console.error('CORS blocked request from origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Middleware
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


// ── API Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Graxion Auth Service is running',
    service: 'graxion-auth',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('❌ Error:', err.stack);

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 5MB.',
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 6000;

app.listen(PORT, () => {
  console.log(`\n🔐 ══════════════════════════════════════════`);
  console.log(`   Graxion Auth Service running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`🔐 ══════════════════════════════════════════\n`);
});
