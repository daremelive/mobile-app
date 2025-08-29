import { API_BASE_URL } from '../config/env';

/**
 * Utility for generating dynamic image URLs using centralized configuration
 */
class ImageURLGenerator {
  private static instance: ImageURLGenerator;

  static getInstance(): ImageURLGenerator {
    if (!ImageURLGenerator.instance) {
      ImageURLGenerator.instance = new ImageURLGenerator();
    }
    return ImageURLGenerator.instance;
  }

  /**
   * Get the base URL for the server (instant - no async needed)
   */
  getBaseURL(): string {
    return API_BASE_URL;
  }

  /**
   * Generate full image URL for profile pictures and other images (now synchronous!)
   */
  getImageURL(imagePath: string | undefined | null): string | null {
    if (!imagePath) return null;
    
    const baseURL = this.getBaseURL();
    
    // Handle different image path formats
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      // Already a full URL
      return imagePath;
    } else if (imagePath.startsWith('/media/')) {
      // Absolute media path
      return `${baseURL}${imagePath}`;
    } else if (imagePath.startsWith('/')) {
      // Absolute path
      return `${baseURL}${imagePath}`;
    } else {
      // Relative path
      return `${baseURL}/${imagePath}`;
    }
  }

  /**
   * Generate media URL for gifts and other media files (now synchronous!)
   */
  getMediaURL(mediaPath: string | undefined | null): string | null {
    if (!mediaPath) return null;
    
    const baseURL = this.getBaseURL();
    
    if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
      return mediaPath;
    } else if (mediaPath.startsWith('/media/')) {
      return `${baseURL}${mediaPath}`;
    } else if (mediaPath.startsWith('/')) {
      return `${baseURL}/media${mediaPath}`;
    } else {
      return `${baseURL}/media/${mediaPath}`;
    }
  }
}

export default ImageURLGenerator.getInstance();
