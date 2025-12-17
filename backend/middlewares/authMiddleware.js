// middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * protect - verifies JWT, attaches req.user
 */
const protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer "))
      return res
        .status(401)
        .json({ success: false, message: "Not authorized, no token" });

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-passwordHash");
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "Not authorized" });

    req.user = user;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: "Not authorized, token failed" });
  }
};

/**
 * Admin only guard
 */
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res
      .status(403)
      .json({ success: false, message: "Admin access only" });
  }
  next();
};

/**
 * Role checker
 */
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user)
      return res
        .status(401)
        .json({ success: false, message: "Not authorized" });

    if (!allowedRoles.includes(req.user.role))
      return res.status(403).json({
        success: false,
        message: "Access denied – insufficient role",
      });

    next();
  };
};

module.exports = { protect, adminOnly, checkRole };
