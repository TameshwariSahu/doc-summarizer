const crypto = require('crypto');

const normalizeForHash = (text) => text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();

const hashDocumentContent = (text) => {
  const norm = normalizeForHash(text);
  return crypto.createHash('sha256').update(norm, 'utf8').digest('hex');
};

module.exports = { normalizeForHash, hashDocumentContent };
