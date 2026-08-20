import multer from 'multer';

// Use memory storage for Cloudinary upload
const storage = multer.memoryStorage();

// File filter — only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed'), false);
  }
};

// Multer instance for avatar uploads
export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_AVATAR_SIZE) || 5 * 1024 * 1024, // 5MB
  },
});
