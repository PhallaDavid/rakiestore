import crypto from 'crypto';

// Fixed ABA PayWay Sandbox Credentials
const ABA_CONFIG = {
  merchantId: 'ec474952',
  apiKey: '94e2612a513e6396a47d6474bacb4a314b654161',
  hashKey: '94e2612a513e6396a47d6474bacb4a314b654161',
  baseUrl: 'https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/purchase'
};

/**
 * Generate HMAC-SHA512 hash for ABA PayWay
 * Standard ABA PayWay requires Base64 encoding of the HMAC.
 * @param {string} rawString - The concatenated values in specific order
 * @returns {string} Base64 encoded hash
 */
export const generateHash = (rawString) => {
  return crypto
    .createHmac('sha512', ABA_CONFIG.hashKey)
    .update(rawString)
    .digest('base64');
};

export const getABAConfig = () => ({
  merchantId: ABA_CONFIG.merchantId,
  apiKey: ABA_CONFIG.apiKey,
  baseUrl: ABA_CONFIG.baseUrl
});
