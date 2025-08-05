import IPDetector from './ipDetector';

/**
 * Utility for generating dynamic image URLs based on detected server IP
 */
class ImageURLGenerator {
  private static instance: ImageURLGenerator;
  private cachedBaseURL: string | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_DURATION = 60000; // 1 minute cache

  static getInstance(): ImageURLGenerator {
    if (!ImageURLGenerator.instance) {
      ImageURLGenerator.instance = new ImageURLGenerator();
    }
    return ImageURLGenerator.instance;
  }

  /**
   * Get the base URL for the server
   */
  async getBaseURL(): Promise<string> {
    const now = Date.now();
    
    // Return cached result if still valid
    if (this.cachedBaseURL && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.cachedBaseURL;
    }

    try {
      const detection = await IPDetector.detectIP();
      this.cachedBaseURL = `http://${detection.ip}:8000`;
      this.cacheTimestamp = now;
      return this.cachedBaseURL;
    } catch (error) {
      console.warn('❌ [ImageURLGenerator] Failed to detect IP, using fallback');
      // Use the current known working IP as fallback
      this.cachedBaseURL = 'http://172.20.10.2:8000';
      this.cacheTimestamp = now;
      return this.cachedBaseURL;
    }
  }

  /**
   * Generate full image URL for profile pictures and other images
   */
  async getImageURL(imagePath: string | undefined | null): Promise<string | null> {
    if (!imagePath) return null;
    
    try {
      const baseURL = await this.getBaseURL();
      
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
    } catch (error) {
      console.warn('❌ [ImageURLGenerator] Failed to generate image URL:', error);
      return null;
    }
  }

  /**
   * Generate media URL for gifts and other media files
   */
  async getMediaURL(mediaPath: string | undefined | null): Promise<string | null> {
    if (!mediaPath) return null;
    
    try {
      const baseURL = await this.getBaseURL();
      
      if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
        return mediaPath;
      } else if (mediaPath.startsWith('/media/')) {
        return `${baseURL}${mediaPath}`;
      } else if (mediaPath.startsWith('/')) {
        return `${baseURL}/media${mediaPath}`;
      } else {
        return `${baseURL}/media/${mediaPath}`;
      }
    } catch (error) {
      console.warn('❌ [ImageURLGenerator] Failed to generate media URL:', error);
      return null;
    }
  }

  /**
   * Clear the cached base URL (force re-detection)
   */
  clearCache(): void {
    this.cachedBaseURL = null;
    this.cacheTimestamp = 0;
  }
}

export default ImageURLGenerator.getInstance();
