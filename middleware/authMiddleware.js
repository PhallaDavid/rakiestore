import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ message: 'Authentication required, please login.' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'your_secret_key';
    const decoded = jwt.verify(token.replace('Bearer ', ''), secret);
    req.user = decoded; // add user payload to request
    next();
  } catch (err) {
    return res.status(400).json({ message: 'Invalid token.' });
  }
};
