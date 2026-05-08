const OpenAI = require('openai');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Summary = require('../models/Summary');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

// Prompt builder — format ke hisaab se
const buildPrompt = (text, format) => {
  const formats = {
    bullets: `Summarize the following document in 5-7 clear bullet points. Each bullet should be one sentence. Focus on key information only.

Document:
${text}`,

    paragraph: `Summarize the following document in 2-3 concise paragraphs. Be clear and professional.

Document:
${text}`,

    json: `Summarize the following document and return ONLY a valid JSON object with this structure:
{
  "title": "document topic",
  "summary": "2-3 sentence overview",
  "key_points": ["point1", "point2", "point3"],
  "action_items": ["item1", "item2"]
}
Return ONLY JSON, no extra text.

Document:
${text}`
  };

  return formats[format] || formats.bullets;
};

// OpenAI se summary lena
const getSummaryFromAI = async (text, format) => {
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
            role: 'user',
            content: `Summarize this section briefly in 3-4 sentences:\n\n${chunk}`
          }
        ],
        max_tokens: 300
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
const summarizeFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File upload karo!' });
    }

    const format = req.body.format || 'bullets';
    let extractedText = '';
    let fileType = '';

    // PDF ya DOCX se text nikalo
    if (req.file.mimetype === 'application/pdf') {
      const pdfData = await pdfParse(req.file.buffer);
      extractedText = pdfData.text;
      fileType = 'pdf';
    } else {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      extractedText = result.value;
      fileType = 'docx';
    }

    if (!extractedText.trim()) {
      return res.status(400).json({ message: 'Document mein text nahi mila!' });
    }

    // AI se summary lo
    const summaryText = await getSummaryFromAI(extractedText, format);

    // MongoDB mein save karo
    const summary = await Summary.create({
      userId: req.user.id,
      fileName: req.file.originalname,
      fileType,
      originalLength: extractedText.split(' ').length,
      summaryFormat: format,
      summaryText
    });

    res.json({
      message: 'Summary ready!',
      summary
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error!', error: err.message });
  }
};

// Plain text summarize
const summarizeText = async (req, res) => {
  try {
    const { text, format } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'Text bhejo!' });
    }

    const summaryText = await getSummaryFromAI(text, format || 'bullets');

    const summary = await Summary.create({
      userId: req.user.id,
      fileName: 'Plain Text',
      fileType: 'text',
      originalLength: text.split(' ').length,
      summaryFormat: format || 'bullets',
      summaryText
    });

    res.json({
      message: 'Summary ready!',
      summary
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error!', error: err.message });
  }
};

module.exports = { summarizeFile, summarizeText };