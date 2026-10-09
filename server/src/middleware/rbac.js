function authorize(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!allowedRoles.length) {
      return next();
    }

    const userRole = req.user.role_name;
    const isAllowed = allowedRoles.some(
      (role) => role.toLowerCase() === userRole.toLowerCase()
    );

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Action requires one of: [${allowedRoles.join(', ')}]. Current role: ${userRole}.`
      });
    }

    next();
  };
}

module.exports = { authorize };
