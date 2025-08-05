import ipDetector from './ipDetector';

/**
 * Auto-detect the local development server IP address using the enhanced IP detector
 */
export const getLocalServerIP = async (): Promise<string> => {
  console.log('🔧 Auto-detecting local server IP using IPDetector...');
  const detection = await ipDetector.detectIP();
  console.log(`🔗 Auto-detected IP: ${detection.ip} (method: ${detection.method}, confidence: ${detection.confidence})`);
  return detection.ip;
};

/**
 * Get the complete API base URL for backend services
 */
export const getApiBaseUrl = async (port: number = 8000): Promise<string> => {
  const ip = await getLocalServerIP();
  const url = `http://${ip}:${port}/api`;
  console.log(`🚀 Final API Base URL: ${url}`);
  return url;
};

/**
 * Get the base server URL (without /api suffix)
 */
export const getServerBaseUrl = async (port: number = 8000): Promise<string> => {
  const ip = await getLocalServerIP();
  const url = `http://${ip}:${port}`;
  console.log(`🚀 Final Server Base URL: ${url}`);
  return url;
};
