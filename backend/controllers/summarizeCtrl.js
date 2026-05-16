const OpenAI = require('openai');
const pdfParseLib = require('pdf-parse');
const pdfParse = pdfParseLib.default || pdfParseLib;
const mammoth = require('mammoth');
const axios = require('axios');
const Summary = require('../models/Summary');
const StoredDocument = require('../models/StoredDocument');
const { hashDocumentContent } = require('../utils/contentHash');
const AppError = require('../utils/AppError');

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

const ALLOWED_FORMATS = new Set(['bullets', 'paragraph']);
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

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

const detectDocumentType = (text) => {
  const lower = text.toLowerCase();

  if (
    lower.includes('experience') &&
    lower.includes('education') &&
    lower.includes('skills')
  ) {
    return 'resume';
  }

  if (
    lower.includes('abstract') ||
    lower.includes('methodology') ||
    lower.includes('conclusion')
  ) {
    return 'research';
  }

  return 'general';
};

const buildPrompt = (text, format, language = 'English') => {
  const formats = {
    bullets: `Summarize the following text into 5-6 bullet points.

Rules:
- Each bullet should be 1 sentence, around 20-30 words
- Be specific — mention actual examples from the text
- Do not be too vague or too long
- Capture the key idea WITH enough context to make sense
- No filler words or repetition
- Write the summary in ${language} language

Example of a GOOD bullet:
- AI will automate routine tasks like data entry and customer service, displacing some jobs but creating new high-value roles.

Example of a BAD bullet (too short):
- AI automates tasks.

Example of a BAD bullet (too long):
- AI is expected to automate routine cognitive tasks which will lead to job displacement in roles like data entry, customer service, and content generation, however it does not replace the need for humans.

Text:
 ${text}

Balanced Summary:`,

    paragraph: `Summarize the following text into a concise paragraph.

Rules:
- The summary MUST be SHORTER than the original text — ideally 25-35% of the original length
- Do NOT copy or closely paraphrase sentences from the original
- Extract ONLY the core ideas and key points
- Write naturally and professionally in continuous paragraph format
- Do NOT add information, interpretations, or philosophical concepts not in the original
- Be precise and to-the-point — every sentence must earn its place
- If the text is short (under 100 words), summary should be 2-3 sentences max
- If the text is medium (100-300 words), summary should be 4-6 sentences max
- If the text is long (300+ words), summary should be 6-8 sentences max
- Write in ${language}

Text:
 ${text}

Concise Summary:`
  };
  return formats[format] || formats.bullets;
};

const buildLocalFallbackSummary = (text) => {
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
  return sentences.slice(0, 5).map((s) => `- ${s}`).join('\n');
};

const getSummaryFromAI = async (text, format, language = 'English') => {
  console.log("=== Groq API Key exists:", !!process.env.GROQ_API_KEY);
  console.log("=== Calling Groq...");

  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY missing.');
  }

  const chunks = chunkText(text);
  let finalText = text;

  if (chunks.length > 1) {
    const chunkSummaries = [];
    for (let chunk of chunks) {
      const res = await openai.chat.completions.create({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: 'Summarize this section briefly in 3-4 sentences in your own words.' },
          { role: 'user', content: chunk }
        ],
        max_tokens: 300,
        temperature: 0.5
      });
      chunkSummaries.push(res.choices[0].message.content);
    }
    finalText = chunkSummaries.join('\n\n');
  }

  // ✅ Dynamic max_tokens based on input length
  const inputWordCount = finalText.split(/\s+/).length;
  let maxTokens;
  if (inputWordCount < 100) {
    maxTokens = 150;   // Short input → very short summary
  } else if (inputWordCount < 300) {
    maxTokens = 250;   // Medium input → short summary
  } else {
    maxTokens = 500;   // Long input → moderate summary
  }

  const response = await openai.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are a precise and CONCISE document summarizer.

STRICT RULES:
- The summary MUST be significantly shorter than the original text
- NEVER write a summary that is longer than or equal to the input
- Do NOT add interpretations, assumptions, or extra philosophical concepts
- Only include information explicitly present in the text
- Every sentence must convey new information — no repetition
- If the input is short, the summary should be even shorter
- Be direct and factual — remove all fluff`
      },
      {
        role: 'user',
        content: buildPrompt(finalText, format, language)
      }
    ],
    max_tokens: maxTokens,   // ✅ Dynamic limit
    temperature: 0.2,
  });

  console.log("=== Groq Response received!");
  return response.choices[0].message.content;
};

// ✅ summarizeFile — fully fixed
const summarizeFile = async (req, res, next) => {
  try {
    // ✅ All variables declared FIRST before any use
    let extractedText = '';
    let fileType = '';

    if (!req.file) return next(new AppError(400, 'Please upload a file!'));

    const requestedFormat = req.body.format || 'bullets';
    const format = ALLOWED_FORMATS.has(requestedFormat) ? requestedFormat : 'bullets';
    const language = req.body.language || 'English'; // ✅ declared before use

    if (req.file.mimetype === 'application/pdf') {
      const pdfData = await pdfParse(req.file.buffer);
      extractedText = pdfData.text;
      fileType = 'pdf';
    } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      extractedText = result.value;
      fileType = 'docx';
    } else {
      return next(new AppError(400, 'Only PDF or DOCX files allowed!'));
    }

    if (!extractedText.trim()) return next(new AppError(400, 'No text found in document!'));

    const contentHash = hashDocumentContent(extractedText);
    await StoredDocument.findOneAndUpdate(
      { contentHash },
      { $setOnInsert: { extractedText, fileName: req.file.originalname } },
      { upsert: true }
    );

    // Store in vector DB
    try {
      await axios.post(`${AI_SERVICE_URL}/store`, {
        content_hash: contentHash,
        text: extractedText
      });
    } catch (e) {
      console.log('AI service store failed:', e.message);
    }

    // ✅ Only ONE call to getSummaryFromAI, with language passed
    let summaryText;
    let fallback = false;

    try {
      summaryText = await getSummaryFromAI(extractedText, format, language);
    } catch (err) {
      console.log("=== Groq ERROR:", err.status, err.message);
      summaryText = buildLocalFallbackSummary(extractedText);
      fallback = true;
    }

    const summary = await Summary.create({
      userId: req.user.id,
      fileName: req.file.originalname,
      fileType,
      originalLength: extractedText.split(' ').length,
      summaryFormat: format,
      summaryLanguage: language,
      summaryText,
      contentHash
    });

    res.json({
      message: fallback ? 'Groq failed. Local summary generated.' : 'Summary ready!',
      summary,
      fallback
    });

  } catch (err) {
    next(err);
  }
};

// ✅ summarizeText — fully fixed
const summarizeText = async (req, res, next) => {
  try {
    // ✅ All variables declared FIRST before any use
    const { text: bodyText, format } = req.body;
    const language = req.body.language || 'English'; // ✅ declared before use

    if (!bodyText || typeof bodyText !== 'string' || !bodyText.trim()) {
      return next(new AppError(400, 'Please send text!'));
    }

    const text = bodyText.trim();
    const safeFormat = ALLOWED_FORMATS.has(format) ? format : 'bullets';

    const contentHash = hashDocumentContent(text);
    await StoredDocument.findOneAndUpdate(
      { contentHash },
      { $setOnInsert: { extractedText: text, fileName: 'Plain Text' } },
      { upsert: true }
    );

    // Store in vector DB
    try {
      await axios.post(`${AI_SERVICE_URL}/store`, {
        content_hash: contentHash,
        text
      });
    } catch (e) {
      console.log('AI service store failed:', e.message);
    }

    // ✅ Only ONE call to getSummaryFromAI, with language passed
    let summaryText;
    let fallback = false;

    try {
      summaryText = await getSummaryFromAI(text, safeFormat, language);
    } catch (err) {
      console.log("=== Groq ERROR:", err.status, err.message);
      summaryText = buildLocalFallbackSummary(text);
      fallback = true;
    }

    // ✅ Removed req.file.originalname and fileType (don't exist in text route)
    const summary = await Summary.create({
      userId: req.user.id,
      fileName: 'Plain Text',
      fileType: 'text',
      originalLength: text.split(/\s+/).length,
      summaryFormat: safeFormat,
      summaryLanguage: language,
      summaryText,
      contentHash
    });

    res.json({
      message: fallback ? 'Groq failed. Local summary generated.' : 'Summary ready!',
      summary,
      fallback
    });

  } catch (err) {
    next(err);
  }
};

module.exports = { summarizeFile, summarizeText };
