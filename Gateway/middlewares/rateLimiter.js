import rateLimit from 'express-rate-limit';

const TIME_WINDOW = process.env.TIME_WINDOW || 60;
const MAX_TASKS = process.env.MAX_TASKS || 50;

export const rateLimiterUsingThirdParty = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'You have exceeded requests limit!', 
  standardHeaders: true,
  legacyHeaders: false,
});