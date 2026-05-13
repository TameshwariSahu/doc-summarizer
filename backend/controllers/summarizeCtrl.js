const OpenAI = require('openai');
const pdfParse = require('pdf-parse');
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

const buildPrompt = (text, format, language = 'English') => {
const formats = {
  bullets: `Summarize the following text into 5-6 meaningful bullet points.

Rules:
- Preserve important concepts, terminology, and context
- Maintain the original meaning of the text
- Write coherent and complete summaries
- Avoid incomplete sentences
- Do not introduce concepts that are not explicitly present in the text
- Keep each bullet concise and under 2 sentences
- Focus only on the key ideas present in the input
- Write the summary in ${language} language
Text:
${text}

Accurate Summary:`,

    paragraph: `You are an expert analyst. Read the following text and write a meaningful summary in 2-3 paragraphs.

Rules:
- Explain the MEANING and SIGNIFICANCE in your own words
- Focus on the core message and key concepts
- Be clear and professional

Text:
${text}

Summary (in your own words):`,
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
        temperature: 0.2
      });
      chunkSummaries.push(res.choices[0].message.content);
    }
    finalText = chunkSummaries.join('\n\n');
  }

  const response = await openai.chat.completions.create({
   model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
     content: `
        You are a precise document summarizer.

        Rules:
        - Preserve the original meaning and context
        - Do not add interpretations, assumptions, or extra philosophical concepts
        - Only include information explicitly present in the text
        - Keep summaries concise, coherent, and factually grounded
        ` },
      {
        role: 'user',
        content: buildPrompt(finalText, format, language)
      }
    ],
    max_tokens: 1000,
    temperature: 0.2,
    // frequency_penalty: 0.5,
    // presence_penalty: 0.3
  });

  console.log("=== Groq Response received!");
  return response.choices[0].message.content;
};

const summarizeFile = async (req, res, next) => {
  const language = req.body.language || 'English';
  const summaryText = await getSummaryFromAI(extractedText, format, language);

  let extractedText = '';
  let fileType = '';
  let format = 'bullets';

  try {
    if (!req.file) return next(new AppError(400, 'Please upload a file!'));

    const requestedFormat = req.body.format || 'bullets';
    format = ALLOWED_FORMATS.has(requestedFormat) ? requestedFormat : 'bullets';

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

    let summaryText;
    let fallback = false;

    try {
      summaryText = await getSummaryFromAI(extractedText, format);
    } catch (err) {
      console.log("=== OpenAI ERROR:", err.status, err.message);
      summaryText = buildLocalFallbackSummary(extractedText);
      fallback = true;
    }

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
      message: fallback ? 'OpenAI failed. Local summary generated.' : 'Summary ready!',
      summary,
      fallback
    });

  } catch (err) {
    next(err);
  }
};

const summarizeText = async (req, res, next) => {
const language = req.body.language || 'English';
const summaryText = await getSummaryFromAI(text, safeFormat, language);
  let text = '';
  let safeFormat = 'bullets';

  try {
    const { text: bodyText, format } = req.body;

    if (!bodyText || typeof bodyText !== 'string' || !bodyText.trim()) {
      return next(new AppError(400, 'Please send text!'));
    }

    text = bodyText.trim();
    safeFormat = ALLOWED_FORMATS.has(format) ? format : 'bullets';

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

    let summaryText;
    let fallback = false;

    try {
      summaryText = await getSummaryFromAI(text, safeFormat);
    } catch (err) {
      console.log("=== OpenAI ERROR:", err.status, err.message);
      summaryText = buildLocalFallbackSummary(text);
      fallback = true;
    }

    const summary = await Summary.create({
      userId: req.user.id,
      fileName: req.file.originalname,
      fileType,
      originalLength: text.split(/\s+/).length,
      summaryFormat: safeFormat,
      summaryLanguage: language,
      summaryText,
      contentHash
    });

    res.json({
      message: fallback ? 'OpenAI failed. Local summary generated.' : 'Summary ready!',
      summary,
      fallback
    });

  } catch (err) {
    next(err);
  }
};

module.exports = { summarizeFile, summarizeText };