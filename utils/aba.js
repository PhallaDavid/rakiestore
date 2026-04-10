import crypto from 'crypto';

// Fixed ABA PayWay Sandbox Credentials
const ABA_CONFIG = {
  merchantId: 'ec474952',
  apiKey: '94e2612a513e6396a47d6474bacb4a314b654161',
  baseUrl: 'https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/purchase',
};

/**
 * Generate HMAC-SHA512 hash for ABA PayWay (Strictly following official docs)
 * Hash order: req_time, merchant_id, tran_id, amount, items, shipping, firstname, lastname, email, phone, type, payment_option, return_url, cancel_url, continue_success_url, return_deeplink, currency, custom_fields, return_params, payout, lifetime, additional_params, google_pay_token, skip_success_page
 * @param {Object} data 
 * @returns {string} Base64 encoded hash
 */
export const generateHash = (data) => {
  const fields = [
    'req_time', 'merchant_id', 'tran_id', 'amount', 'items', 'shipping', 
    'firstname', 'lastname', 'email', 'phone', 'type', 'payment_option', 
    'return_url', 'cancel_url', 'continue_success_url', 'return_deeplink', 
    'currency', 'custom_fields', 'return_params', 'payout', 'lifetime', 
    'additional_params', 'google_pay_token', 'skip_success_page'
  ];

  const raw = fields.map(field => data[field] ?? '').join('');
  
  console.log("ABA HASH RAW STRING:", raw); // For debugging

  return crypto
    .createHmac('sha512', ABA_CONFIG.apiKey)
    .update(raw)
    .digest('base64');
};

/**
 * Helper to encode strings/objects to Base64
 */
export const toBase64 = (val) => {
  if (typeof val === 'object') {
    return Buffer.from(JSON.stringify(val)).toString('base64');
  }
  return Buffer.from(String(val)).toString('base64');
};

export const getABAConfig = () => ({
  merchantId: ABA_CONFIG.merchantId,
  apiKey: ABA_CONFIG.apiKey,
  baseUrl: ABA_CONFIG.baseUrl
});
