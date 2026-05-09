const Summary = require('../models/Summary');

// Saari summaries fetch karo
const getHistory = async (req, res, next) => {
  try {
    const summaries = await Summary.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    res.json(summaries);
  } catch (err) {
    next(err);
  }
};

// Ek summary fetch karo
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

// Summary delete karo
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

module.exports = { getHistory, getSummary, deleteSummary };