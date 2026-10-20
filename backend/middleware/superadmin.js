const User = require('../models/User');

module.exports = async function(req, res, next) {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Auto-promote super@gmail.com if not already set
    if (user.email === 'super@gmail.com' && user.role !== 'superadmin') {
      user.role = 'superadmin';
      await user.save();
    }

    if (user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied: Super Admin privilege required.' });
    }

    req.superUser = user;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Super admin authorization error', error: error.message });
  }
};
