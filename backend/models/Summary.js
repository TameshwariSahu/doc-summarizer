const mongoose = require('mongoose');

const summarySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['pdf', 'docx', 'text'],
    required: true
  },
  originalLength: {
    type: Number
  },
  summaryFormat: {
    type: String,
    enum: ['bullets', 'paragraph', 'json'],
    default: 'bullets'
  },
  summaryText: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Summary', summarySchema);