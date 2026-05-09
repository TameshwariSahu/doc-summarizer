const AppError = require('../utils/AppError');

const errorHandler = (err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ message: 'Invalid JSON body.' });
  }

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server error!';

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format.';
  }

  if (err.code === 11000) {
    statusCode = 400;
    const field = err.keyValue ? Object.keys(err.keyValue).join(', ') : 'field';
    message = `Duplicate value: ${field} pehle se use ho chuka hai.`;
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors || {})
      .map((e) => e.message)
      .join(' ');
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token invalid hai!';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expire ho gaya. Dobara login karo.';
  }

  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    message = 'Server error! Baad mein try karo.';
  }

  if (statusCode >= 500) {
    console.error('[error]', err.message, err.stack || '');
  }

  const payload = { message };
  if (process.env.NODE_ENV !== 'production' && statusCode >= 500) {
    payload.error = err.message;
  }

  res.status(statusCode).json(payload);
};

module.exports = errorHandler;
