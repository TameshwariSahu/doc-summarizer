const AppError = require('../utils/AppError');

const notFound = (req, res, next) => {
  next(new AppError(404, `Route nahi mila: ${req.method} ${req.originalUrl}`));
};

module.exports = notFound;
