const mongoose = require('mongoose');

const storedDocumentSchema = new mongoose.Schema(
  {
    contentHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    extractedText: {
      type: String,
      required: true
    },
    fileName: {
      type: String,
      default: 'document'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('StoredDocument', storedDocumentSchema);
