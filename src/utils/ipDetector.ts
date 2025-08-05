import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Enhanced IP Detection Utility for DareMe API
 * Automatically detects the local development server IP address
 */

interface IPDetectionResult {
  ip: string;
  method: string;
  confidence: 'high' | 'medium' | 'low';
}

class IPDetector {
  private static instance: IPDetector;
  private cachedResult: IPDetectionResult | null = null;
  private readonly CACHE_DURATION = 30000; // 30 seconds
  private cacheTimestamp = 0;

  static getInstance(): IPDetector {
    if (!IPDetector.instance) {
      IPDetector.instance = new IPDetector();
    }
    return IPDetector.instance;
  }

  /**
   * Get the best available IP address for the development server
   */
  async detectIP(): Promise<IPDetectionResult> {
    const now = Date.now();
    
    // Return cached result if still valid
    if (this.cachedResult && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.cachedResult;
    }

    const detectionMethods = [
      this.detectFromManifest.bind(this),
      this.detectFromConstants.bind(this),
      this.detectFromMetro.bind(this),
      this.detectFromNetwork.bind(this),
    ];

    for (const method of detectionMethods) {
      try {
        const result = await method();
        if (result) {
          this.cachedResult = result;
          this.cacheTimestamp = now;
          return result;
        }
      } catch (error) {
        // Silently continue to next method
      }
    }

    // Final fallback
    const fallback: IPDetectionResult = {
      ip: '172.20.10.2', // Use the actual server IP as fallback
      method: 'fallback',
      confidence: 'low'
    };
    
    this.cachedResult = fallback;
    this.cacheTimestamp = now;
    return fallback;
  }

  /**
   * Method 1: Detect from Expo manifest (most reliable for Expo Go)
   */
  private async detectFromManifest(): Promise<IPDetectionResult | null> {
    try {
      const manifest = Constants.manifest as any || Constants.manifest2?.extra?.expoClient as any;
      
      if (manifest?.debuggerHost) {
        const ip = manifest.debuggerHost.split(':')[0];
        if (this.isValidIP(ip)) {
          return {
            ip,
            method: 'expo-manifest-debuggerHost',
            confidence: 'high'
          };
        }
      }

      if (manifest?.hostUri) {
        const ip = manifest.hostUri.split(':')[0];
        if (this.isValidIP(ip)) {
          return {
            ip,
            method: 'expo-manifest-hostUri',
            confidence: 'high'
          };
        }
      }
    } catch (error) {
      console.log('📱 [IPDetector] Manifest detection failed:', error);
    }
    return null;
  }

  /**
   * Method 2: Detect from Expo Constants
   */
  private async detectFromConstants(): Promise<IPDetectionResult | null> {
    try {
      // Check various Expo constants properties
      const expoConfig = Constants.expoConfig as any;
      const manifest2 = Constants.manifest2 as any;
      
      // Try debuggerHost from different locations
      const possibleHosts = [
        expoConfig?.debuggerHost,
        manifest2?.extra?.expoClient?.debuggerHost,
        (Constants as any).debuggerHost,
      ].filter(Boolean);

      for (const host of possibleHosts) {
        if (typeof host === 'string') {
          const ip = host.split(':')[0];
          if (this.isValidIP(ip)) {
            return {
              ip,
              method: 'expo-constants',
              confidence: 'high'
            };
          }
        }
      }
    } catch (error) {
      console.log('📱 [IPDetector] Constants detection failed:', error);
    }
    return null;
  }

  /**
   * Method 3: Detect from Metro bundler URL
   */
  private async detectFromMetro(): Promise<IPDetectionResult | null> {
    try {
      // In development, Metro bundler serves the bundle
      // We can try to extract IP from the bundle URL
      if (__DEV__ && Platform.OS !== 'web') {
        // This is a bit hacky but can work in some scenarios
        const possibleIPs = [
          this.extractIPFromURL(Constants.linkingUrl),
          this.extractIPFromURL(Array.isArray(Constants.expoConfig?.scheme) ? Constants.expoConfig.scheme[0] : Constants.expoConfig?.scheme),
        ].filter(Boolean) as string[];

        for (const ip of possibleIPs) {
          if (this.isValidIP(ip)) {
            return {
              ip,
              method: 'metro-bundler',
              confidence: 'medium'
            };
          }
        }
      }
    } catch (error) {
      console.log('📱 [IPDetector] Metro detection failed:', error);
    }
    return null;
  }

  /**
   * Method 4: Network-based detection (fallback)
   */
  private async detectFromNetwork(): Promise<IPDetectionResult | null> {
    try {
      // Common local network IP ranges to try
      const commonIPs = [
        // Current server IP that was detected
        '172.20.10.2', '172.20.10.3', '172.20.10.4', '172.20.10.5',
        // Previous IP ranges
        '192.168.1.117', '192.168.1.1', '192.168.1.100', '192.168.1.101', '192.168.1.102',
        '192.168.0.1', '192.168.0.100', '192.168.0.101', '192.168.0.102',
        '10.0.0.1', '10.0.0.100', '10.0.0.101', '10.0.0.102',
        '172.20.10.1', '172.20.10.6', '172.20.10.7', '172.20.10.8',
      ];

      // Test each IP for connectivity
      for (const ip of commonIPs) {
        console.log(`🔍 [IPDetector] Testing IP: ${ip}`);
        if (await this.testIPConnectivity(ip)) {
          console.log(`✅ [IPDetector] Found working IP: ${ip}`);
          return {
            ip,
            method: 'network-scan',
            confidence: 'medium'
          };
        }
      }
    } catch (error) {
      console.log('📱 [IPDetector] Network detection failed:', error);
    }
    return null;
  }

  /**
   * Test if an IP address is reachable (simplified check)
   */
  private async testIPConnectivity(ip: string): Promise<boolean> {
    try {
      // Simple connectivity test - try to fetch from the IP
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

      const response = await fetch(`http://${ip}:8000/api/health/`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Validate if a string is a valid IP address
   */
  private isValidIP(ip: string): boolean {
    if (!ip || typeof ip !== 'string') return false;
    
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const isValid = ipRegex.test(ip) && ip !== '0.0.0.0'; // Allow 127.0.0.1 for localhost
    
    if (isValid) {
      console.log(`✅ [IPDetector] Valid IP found: ${ip}`);
    } else {
      console.log(`❌ [IPDetector] Invalid IP: ${ip}`);
    }
    
    return isValid;
  }

  /**
   * Extract IP from URL string
   */
  private extractIPFromURL(url: string | undefined): string | null {
    if (!url) return null;
    
    try {
      const match = url.match(/(?:https?:\/\/)?([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Get the API base URL for a given endpoint
   */
  async getAPIBaseURL(endpoint: string = ''): Promise<string> {
    const detection = await this.detectIP();
    const baseUrl = `http://${detection.ip}:8000/api/`;
    const fullUrl = endpoint ? `${baseUrl}${endpoint}/` : baseUrl;
    
    console.log(`🔗 [IPDetector] Generated API URL: ${fullUrl} (confidence: ${detection.confidence})`);
    return fullUrl;
  }

  /**
   * Clear the cached IP (force re-detection)
   */
  clearCache(): void {
    this.cachedResult = null;
    this.cacheTimestamp = 0;
    console.log('🧹 [IPDetector] Cache cleared');
  }
}

export default IPDetector.getInstance();
