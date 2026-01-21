import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  // 🚀 Allow public access if frontend is fetching orders by email
  // Example: GET /api/orders?email=user@gmail.com
  if (req.path.includes("/orders") && req.query?.email) {
    return next(); // skip auth check
  }

  // Prefer token from Authorization header (Bearer) over cookie token
  const authHeader = req.headers?.authorization;
  let token = null;

  if (authHeader) {
    // Expect header like: "Bearer <token>" — extract the token part
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else {
      token = authHeader; // fallback: raw token in header
    }
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized, no token provided",
    });
  }

  try {
    const secret =
      process.env.JWT_SECRET || process.env.TZW_SECRET || "dev_secret";

    if (process.env.NODE_ENV === "development") {
      const src = req.cookies?.token
        ? "cookie"
        : req.headers?.authorization
        ? "header"
        : "none";
      const preview =
        typeof token === "string"
          ? `${token.slice(0, 6)}...${token.slice(-6)}`
          : String(token);
      console.debug(
        `[auth] token source=${src}, tokenPreview=${preview}, JWT_SECRET_set=${!!process
          .env.JWT_SECRET}`
      );
    }

    const decoded = jwt.verify(token, secret);
    req.user = { _id: decoded.id, email: decoded.email };
    next();
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.debug("[auth] jwt.verify failed:", error && error.message);
    }
    const message =
      error.name === "TokenExpiredError" ? "Token expired" : "Invalid Token";
    res.status(403).json({
      success: false,
      message,
    });
  }
};

export default authMiddleware;
