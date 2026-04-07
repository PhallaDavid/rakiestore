function parseOrigins(originsValue) {
  if (!originsValue) return null; // allow all (no credentials)
  const origins = originsValue
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return origins.length ? new Set(origins) : null;
}

function asBool(value, defaultValue = false) {
  if (value == null) return defaultValue;
  return String(value).toLowerCase() === 'true';
}

export default function cors(options = {}) {
  const allowedOrigins =
    options.origins ?? parseOrigins(process.env.CORS_ORIGINS || process.env.CORS_ORIGIN);
  const allowCredentials = options.credentials ?? asBool(process.env.CORS_CREDENTIALS, false);
  const allowMethods =
    options.methods ??
    process.env.CORS_METHODS ??
    'GET,POST,PUT,PATCH,DELETE,OPTIONS';
  const defaultAllowHeaders =
    options.headers ??
    process.env.CORS_HEADERS ??
    'Content-Type, Authorization';
  const exposeHeaders = options.exposeHeaders ?? process.env.CORS_EXPOSE_HEADERS;
  const maxAge = options.maxAge ?? process.env.CORS_MAX_AGE;

  return function corsMiddleware(req, res, next) {
    const requestOrigin = req.headers.origin;

    if (allowedOrigins === null) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (requestOrigin && allowedOrigins.has(requestOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      res.setHeader('Vary', 'Origin');
      if (allowCredentials) res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.setHeader('Access-Control-Allow-Methods', allowMethods);

    const requestHeaders = req.headers['access-control-request-headers'];
    res.setHeader(
      'Access-Control-Allow-Headers',
      requestHeaders ? String(requestHeaders) : defaultAllowHeaders
    );

    if (exposeHeaders) res.setHeader('Access-Control-Expose-Headers', exposeHeaders);
    if (maxAge != null) res.setHeader('Access-Control-Max-Age', String(maxAge));

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    next();
  };
}

