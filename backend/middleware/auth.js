const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';

module.exports = function(req, res, next) {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

  try {
    const bearerToken = token.split(' ')[1] || token;
    if (!bearerToken || bearerToken === 'null' || bearerToken === 'undefined') {
      return res.status(401).json({ message: 'Access denied. Invalid token format.' });
    }
    const decoded = jwt.verify(bearerToken, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};
