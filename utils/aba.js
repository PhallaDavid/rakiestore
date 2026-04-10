import crypto from 'crypto';

// Fixed ABA PayWay Sandbox Credentials
const ABA_CONFIG = {
  merchantId: 'ec474952',
  apiKey: '94e2612a513e6396a47d6474bacb4a314b654161',
  hashKey: '94e2612a513e6396a47d6474bacb4a314b654161', // Usually Public Key is used for Sandbox hashing
  baseUrl: 'https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/purchase',
  // RSA Keys (Saved for V2 or status verification if needed)
  rsaPublicKey: `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCB2r0oZlVDiSMupZGatIl/G06G
NkrglDP5pNAWo7QqRlR1rLCCXqmNUf2NilV5oG0MWueTrHH7sCBadwqqKJUif0Yl
IknR6iP+RdcdI1vca8KsR73sMTU/clSY7SX8enA8O99zvWXQpoAv0UB+vZPq1xCm
7rsEfPA2PlJ8swXcDQIDAQAB
-----END PUBLIC KEY-----`,
  rsaPrivateKey: `-----BEGIN RSA PRIVATE KEY-----
MIICXAIBAAKBgQCLL4OEPuajY7XJayOaEIplKUdOQ14a0340F6YlHQGPyoBdR2gT
iIrezZAMMXwe4GM39d00z5NGGjObcE6sThWMEllp+i31/auH0UiRNSzrd7CIugxc
/AniaQlC9RSi2AMiaS2a23g4vVM+BuTk6YcEbJBLoqb9sDGXII1CRn8LaQIDAQAB
AoGABKLIpvnsw8WElRWDtwDoIlrxd4NqA4ttGtSTBNqJhjqYzTwqSASsy9aw2Dfs
uhJZhtz76QnYTkX9cPOyalRJrOOh5CyDXg/206Ppfgq8p8XInL7VtVGpwhE7rLbf
WOFSyBQhIGqoBD8RcubXyjwb4izm0DoGakoZGzjFXM5LxHUCQQCWcpfrWAI8UaNA
N29rth2nuR/2IqxLbLV0LSZXmTv6mA5cs35x8QHk/3TwmMSgcRFlvECRcbH1UYf8
3nrfMp2dAkEA7NYvFo28PnPmEDK7S14CordvxeH3jXNtTtGZHiDu8KUE6ynhtHV/
xSumkrxsGxNS+rP85UJe38D16OMm7mNhPQJAD6pO90pqsS0u+njLOUP1QomcMlzZ
4+Cl5DrvSx/Bhw5eMHjgKa0WrWmMG6FMmAgt75HyhzJ3fTvIFSR1VthGYQJBAJtG
8ih/VOQ9aKFGIbYQNPop+oZq2LtM6mW61gEC5qWwC8GC/BAs2VCUhem+z8IQsV7d
kvlcwodBI/lEtMmnLqECQFoyQvlnfdzdWXs8FeiMJC4lDFkFsHnThRrA1NhEeyOb
UTv8KWhoTnegMfN0tVKL5FnCG1txpuRIxo0AioAYJz0=
-----END RSA PRIVATE KEY-----`
};

/**
 * Generate HMAC-SHA512 hash for ABA PayWay
 * @param {Object} data 
 * @returns {string} Hex encoded hash
 */
export const generateHashHex = (data) => {
  const raw = Object.values(data).join('');
  return crypto
    .createHmac('sha512', ABA_CONFIG.hashKey)
    .update(raw)
    .digest('base64');
};

export const verifyHashHex = (data, receivedHash) => {
  const hash = generateHashHex(data);
  return hash === receivedHash;
};

export const getABAConfig = () => ({
  merchantId: ABA_CONFIG.merchantId,
  apiKey: ABA_CONFIG.apiKey,
  baseUrl: ABA_CONFIG.baseUrl
});
