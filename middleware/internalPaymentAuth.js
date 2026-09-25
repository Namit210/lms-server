// middleware/internalPaymentAuth.js

 function internalPaymentAuth(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).json({
      success: false,
      message: "Missing authorization",
    });
  }

  const expected =
    `Bearer ${process.env.LMS_INTERNAL_API_SECRET}`;

  if (authorization !== expected) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  next();
}


module.exports = { internalPaymentAuth };