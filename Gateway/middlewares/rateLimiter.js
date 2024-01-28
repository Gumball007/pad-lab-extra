import rateLimit from 'express-rate-limit';

export const rateLimiterUsingThirdParty = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: 'You have exceeded the 3 requests in 1 minute limit!', 
  standardHeaders: true,
  legacyHeaders: false,
});