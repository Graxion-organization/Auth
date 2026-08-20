import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a file buffer to Cloudinary
 * @param {Buffer} fileBuffer - The file buffer
 * @param {String} folder - Target folder on Cloudinary
 * @returns {Promise<Object>} - The Cloudinary upload response
 */
export const uploadToCloudinary = (fileBuffer, folder = 'graxion/general') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return reject(error);
        }
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

/**
 * Deletes a file from Cloudinary by its public ID
 * @param {String} publicId - The public ID of the file
 * @returns {Promise<Object>} - The Cloudinary destruction response
 */
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`🗑️ Deleted from Cloudinary: ${publicId}`);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error.message);
  }
};

/**
 * Extracts the public ID from a Cloudinary secure_url
 * @param {String} url - The Cloudinary secure_url
 * @returns {String} - The public ID
 */
export const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  try {
    const parts = url.split('/');
    const uploadIndex = parts.findIndex(part => part === 'upload');
    if (uploadIndex === -1) return null;
    
    const afterUpload = parts.slice(uploadIndex + 1);
    
    // Remove version folder if it exists (e.g., v170000000)
    if (afterUpload[0] && afterUpload[0].startsWith('v') && !isNaN(afterUpload[0].substring(1))) {
      afterUpload.shift();
    }
    
    const publicIdWithExt = afterUpload.join('/');
    
    // Remove file extension
    const lastDotIndex = publicIdWithExt.lastIndexOf('.');
    return lastDotIndex !== -1 ? publicIdWithExt.substring(0, lastDotIndex) : publicIdWithExt;
  } catch (error) {
    console.error('Error parsing public ID:', error);
    return null;
  }
};
