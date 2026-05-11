const OpenAI = require('openai');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Summary = require('../models/Summary');
const StoredDocument = require('../models/StoredDocument');
const { hashDocumentContent } = require('../utils/contentHash');
const AppError = require('../utils/AppError');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ALLOWED_FORMATS = new Set(['bullets', 'paragraph', 'json']);

// Text ko chunks mein todna — bade documents ke liye
const chunkText = (text, chunkSize = 3000) => {
  const words = text.split(' ');
  const chunks = [];
  let current = [];

  for (let word of words) {
    current.push(word);
    if (current.length >= chunkSize) {
      chunks.push(current.join(' '));
      current = [];
    }
  }
  if (current.length > 0) chunks.push(current.join(' '));
  return chunks;
};

const buildPrompt = (text, format) => {
  const formats = {
    bullets: `You are an expert analyst. Read the following text carefully and provide a meaningful summary in 5-6 bullet points.

Rules:
- Do NOT copy sentences from the text
- Explain the MEANING and SIGNIFICANCE in your own words
- Each bullet should give a new insight
- Be concise but informative

Text:
${text}

Summary (in your own words):`,

    paragraph: `You are an expert analyst. Read the following text carefully and write a meaningful summary in 2-3 paragraphs.

Rules:
- Do NOT copy sentences from the text
- Explain the MEANING and SIGNIFICANCE in your own words
- Focus on the core message and key concepts
- Be clear and professional

Text:
${text}

Summary (in your own words):`,
  };

  return formats[format] || formats.bullets;
};

// --- Local fallback (no LLM): ordered, section-aware, lightly rephrased — not random TF-IDF picks ---

const toCompleteSentence = (sentence) => {
  const trimmed = sentence.trim();
  if (!trimmed) return '';
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
};

/** Light rewrite so bullets are not verbatim copy-paste of one long clause */
const gentleRephraseForSummary = (s) => {
  let t = s.trim();
  if (!t) return '';
  // Strip common citation wrappers; keep meaning
  t = t.replace(/^It is stated in the [^.]+\([^)]+\)\s+that\s+/i, 'The text teaches that ');
  t = t.replace(/^Only those who have\b/i, 'Eligibility requires those who have');
  t = t.replace(/^All the devotees of the Lord traverse\b/i, 'Devotees travel');
  t = t.replace(/^Those eligible for elevation\b/i, 'Who may rise spiritually');
  t = t.replace(/^For those who are sinful\b/i, 'Sinful or faithless people');
  t = t.replace(/^Persons who have acted piously\b/i, 'People who have done good karma');
  t = t.replace(/\bengage themselves in My service with determination\b/i, 'take up determined devotional service');
  t = t.replace(/\bare freed from the dualities of delusion\b/i, 'are freed from confusion caused by opposing pulls');
  return toCompleteSentence(t);
};

const splitSentences = (block) => {
  if (!block || !block.trim()) return [];
  return block
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 20);
};

/** Detect verse ref like Bg. 7.28 from raw text */
const extractVerseRef = (raw) => {
  const m = raw.match(/\bBg\.?\s*(\d+)\s*[.:]\s*(\d+)\b/i);
  if (m) return `Bhagavad-gītā ${m[1]}.${m[2]}`;
  const m2 = raw.match(/\bchapter\s+(\d+)[,.]?\s*verse\s+(\d+)\b/i);
  if (m2) return `Chapter ${m2[1]}, verse ${m2[2]}`;
  return '';
};

/**
 * Pull Translation / Purport / Synonyms blocks in reading order (for scripture-style docs).
 */
const extractTranslationAndPurport = (text) => {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  let mode = 'body';
  const translationLines = [];
  const purportLines = [];
  const skipLine = (line) => {
    if (!line) return true;
    if (/^synonyms$/i.test(line)) return true;
    if (/^translation$/i.test(line)) return true;
    if (/^purport$/i.test(line)) return true;
    if (/^[a-zA-Zāīūṛṅñṭḍṇśṣṁḥ\-]+\s+—\s+/.test(line)) return true;
    const diac = (line.match(/[āīūṛṅñṭḍṇśṣṁḥ]/gi) || []).length;
    if (diac >= 3 && line.split(/\s+/).length <= 10) return true;
    return false;
  };

  for (const line of lines) {
    if (/^synonyms$/i.test(line)) {
      mode = 'synonyms';
      continue;
    }
    if (/^translation$/i.test(line)) {
      mode = 'translation';
      continue;
    }
    if (/^purport$/i.test(line)) {
      mode = 'purport';
      continue;
    }
    if (skipLine(line) && mode !== 'translation' && mode !== 'purport') continue;
    if (mode === 'translation' && !skipLine(line)) translationLines.push(line);
    if (mode === 'purport' && !skipLine(line)) purportLines.push(line);
  }

  return {
    translation: translationLines.join(' ').trim(),
    purport: purportLines.join(' ').trim()
  };
};

const buildFallbackBulletsFromStructured = (rawText) => {
  const ref = extractVerseRef(rawText);
  const { translation, purport } = extractTranslationAndPurport(rawText);
  const bullets = [];

  if (translation) {
    const ts = splitSentences(translation);
    const gist = ts[0] || translation;
    const lead = ref
      ? `(${ref}) The verse means: ${gentleRephraseForSummary(gist).replace(/\.$/, '')}.`
      : `Main point: ${gentleRephraseForSummary(gist).replace(/\.$/, '')}.`;
    bullets.push(toCompleteSentence(lead));
  }

  const purportSents = splitSentences(purport);
  const seen = new Set(bullets.map((b) => b.toLowerCase().slice(0, 80)));

  for (const sent of purportSents) {
    if (bullets.length >= 6) break;
    const rewritten = gentleRephraseForSummary(sent);
    const key = rewritten.toLowerCase().slice(0, 90);
    if (!rewritten || seen.has(key)) continue;
    seen.add(key);
    bullets.push(rewritten);
  }

  return bullets;
};

/** Generic doc: first lines as intro + sentences in order (no importance shuffle) */
const buildFallbackBulletsGeneric = (text) => {
  const clean = text.replace(/\s+/g, ' ').trim();
  const sentences = splitSentences(clean);
  const bullets = [];
  if (sentences.length) {
    bullets.push(toCompleteSentence(`Overview: ${gentleRephraseForSummary(sentences[0]).replace(/\.$/, '')}`));
  }
  for (let i = 1; i < sentences.length && bullets.length < 6; i++) {
    const r = gentleRephraseForSummary(sentences[i]);
    if (r && !bullets.some((b) => b.slice(0, 60) === r.slice(0, 60))) bullets.push(r);
  }
  return bullets;
};

// OpenAI quota/rate limit hit hone par local fallback summary
const buildLocalFallbackSummary = (text, format = 'bullets') => {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const { translation, purport } = extractTranslationAndPurport(text);
  const structured = translation || purport;
  let bullets = structured ? buildFallbackBulletsFromStructured(text) : buildFallbackBulletsGeneric(text);

  if (!bullets.length) {
    return format === 'json'
      ? JSON.stringify(
          {
            title: 'Document Summary (offline fallback)',
            summary: cleanText.slice(0, 220),
            key_points: [cleanText.slice(0, 220)],
            action_items: []
          },
          null,
          2
        )
      : toCompleteSentence(cleanText.slice(0, 400));
  }

  bullets = bullets.slice(0, 6);

  if (format === 'paragraph') {
    return bullets.slice(0, 4).join(' ');
  }

  if (format === 'json') {
    const payload = {
      title: extractVerseRef(text) || 'Document summary (offline fallback)',
      summary: bullets[0],
      key_points: bullets.slice(1),
      action_items: []
    };
    return JSON.stringify(payload, null, 2);
  }

  return bullets.map((line) => `- ${line}`).join('\n');
};

// OpenAI se summary lena
const getSummaryFromAI = async (text, format) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY missing hai. Backend .env check karo.');
  }

  const chunks = chunkText(text);
  let finalText = text;

  // Agar document bada hai toh pehle chunks summarize karo
  if (chunks.length > 1) {
    const chunkSummaries = [];

    for (let chunk of chunks) {
      const res = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
     {
      role: 'system',
      content: 'You are an expert document summarizer. Be concise, accurate, and professional.'
    },
    {
      role: 'user',
      content: buildPrompt(finalText, format)
    }
  ],
          max_tokens: 1000,
        temperature: 0.5,
        frequency_penalty: 0.5,
        presence_penalty: 0.3
      });
      chunkSummaries.push(res.choices[0].message.content);
    }

    finalText = chunkSummaries.join('\n\n');
  }

  // Final summary banao
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: 'You are an expert document summarizer. Be concise, accurate, and professional.'
      },
      {
        role: 'user',
        content: buildPrompt(finalText, format)
      }
    ],
    max_tokens: 1000
  });

  return response.choices[0].message.content;
};

// File upload + summarize
const summarizeFile = async (req, res, next) => {
  let extractedText = '';
  let fileType = '';
  let format = 'bullets';

  try {
    if (!req.file) {
      return next(new AppError(400, 'File upload karo!'));
    }

    const requestedFormat = req.body.format || 'bullets';
    format = ALLOWED_FORMATS.has(requestedFormat) ? requestedFormat : 'bullets';

    // PDF ya DOCX se text nikalo
    if (req.file.mimetype === 'application/pdf') {
      const pdfData = await pdfParse(req.file.buffer);
      extractedText = pdfData.text;
      fileType = 'pdf';
    } else if (
      req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      extractedText = result.value;
      fileType = 'docx';
    } else {
      return next(new AppError(400, 'Sirf PDF ya DOCX upload karo!'));
    }

    if (!extractedText.trim()) {
      return next(new AppError(400, 'Document mein text nahi mila!'));
    }

    const contentHash = hashDocumentContent(extractedText);
    await StoredDocument.findOneAndUpdate(
      { contentHash },
      { $setOnInsert: { extractedText, fileName: req.file.originalname } },
      { upsert: true }
    );

    // AI se summary lo
    const summaryText = await getSummaryFromAI(extractedText, format);

    // MongoDB mein save karo
    const summary = await Summary.create({
      userId: req.user.id,
      fileName: req.file.originalname,
      fileType,
      originalLength: extractedText.split(' ').length,
      summaryFormat: format,
      summaryText,
      contentHash
    });

    res.json({
      message: 'Summary ready!',
      summary
    });

  } catch (err) {
    const status = err.status || err.statusCode;
    if (status === 401) {
      return next(
        new AppError(500, 'OpenAI auth failed. API key invalid lag rahi hai.')
      );
    }
    if (status === 429) {
      const contentHash = hashDocumentContent(extractedText);
      await StoredDocument.findOneAndUpdate(
        { contentHash },
        { $setOnInsert: { extractedText, fileName: req.file.originalname } },
        { upsert: true }
      );
      const fallbackSummary = buildLocalFallbackSummary(extractedText, format);
      const summary = await Summary.create({
        userId: req.user.id,
        fileName: req.file.originalname,
        fileType,
        originalLength: extractedText.split(' ').length,
        summaryFormat: format,
        summaryText: fallbackSummary,
        contentHash
      });

      return res.json({
        message: 'OpenAI quota exceed ho gaya. Local fallback summary generate ki gayi hai.',
        summary,
        fallback: true
      });
    }
    next(err);
  }
};

// Plain text summarize
const summarizeText = async (req, res, next) => {
  let text = '';
  let safeFormat = 'bullets';

  try {
    const bodyText = req.body.text;
    const format = req.body.format;

    if (!bodyText || typeof bodyText !== 'string' || !bodyText.trim()) {
      return next(new AppError(400, 'Text bhejo!'));
    }

    text = bodyText.trim();
    const requestedFormat = format || 'bullets';
    safeFormat = ALLOWED_FORMATS.has(requestedFormat) ? requestedFormat : 'bullets';

    const contentHash = hashDocumentContent(text);
    await StoredDocument.findOneAndUpdate(
      { contentHash },
      { $setOnInsert: { extractedText: text, fileName: 'Plain Text' } },
      { upsert: true }
    );

    const summaryText = await getSummaryFromAI(text, safeFormat);

    const summary = await Summary.create({
      userId: req.user.id,
      fileName: 'Plain Text',
      fileType: 'text',
      originalLength: text.split(/\s+/).length,
      summaryFormat: safeFormat,
      summaryText,
      contentHash
    });

    res.json({
      message: 'Summary ready!',
      summary
    });

  } catch (err) {
    const status = err.status || err.statusCode;
    if (status === 401) {
      return next(
        new AppError(500, 'OpenAI auth failed. API key invalid lag rahi hai.')
      );
    }
    if (status === 429) {
      const contentHash = hashDocumentContent(text);
      await StoredDocument.findOneAndUpdate(
        { contentHash },
        { $setOnInsert: { extractedText: text, fileName: 'Plain Text' } },
        { upsert: true }
      );
      const fallbackSummary = buildLocalFallbackSummary(text, safeFormat);
      const summary = await Summary.create({
        userId: req.user.id,
        fileName: 'Plain Text',
        fileType: 'text',
        originalLength: text.split(/\s+/).length,
        summaryFormat: safeFormat,
        summaryText: fallbackSummary,
        contentHash
      });

      return res.json({
        message: 'OpenAI quota exceed ho gaya. Local fallback summary generate ki gayi hai.',
        summary,
        fallback: true
      });
    }
    next(err);
  }
};

module.exports = { summarizeFile, summarizeText };