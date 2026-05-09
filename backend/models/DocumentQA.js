const mongoose = require('mongoose');

const documentQASchema = new mongoose.Schema(
  {
    contentHash: {
      type: String,
      required: true,
      index: true
    },
    questionNormalized: {
      type: String,
      required: true,
      index: true
    },
    questionDisplay: {
      type: String,
      required: true
    },
    answer: {
      type: String,
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('DocumentQA', documentQASchema);
