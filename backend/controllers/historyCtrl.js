const Summary = require('../models/Summary');

const getHistory = async (req, res, next) => {
  try {
    const summaries = await Summary.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    res.json(summaries);
  } catch (err) {
    next(err);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const summary = await Summary.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    if (!summary) {
      return res.status(404).json({ message: 'Summary nahi mili!' });
    }
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: 'Server error!', error: err.message });
  }
};

const deleteSummary = async (req, res) => {
  try {
    const summary = await Summary.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });
    if (!summary) {
      return res.status(404).json({ message: 'Summary nahi mili!' });
    }
    res.json({ message: 'Summary deleted!' });
  } catch (err) {
    next(err);
  }
};

const getSummaryPublic = async (req, res, next) => {
  try {
    const summary = await Summary.findById(req.params.id)
      .select('fileName summaryText summaryFormat summaryLanguage createdAt');
    
    if (!summary) {
      return next(new AppError(404, 'Summary not found!'));
    }

    res.json(summary);
  } catch (err) {
    next(err);
  }
};

module.exports = { getHistory, getSummary, deleteSummary, getSummaryPublic };

module.exports = { getHistory, getSummary, deleteSummary };