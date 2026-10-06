const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { marked } = require('marked');
const auth = require('../middleware/auth'); // Assuming you want to protect this route

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY || 'dummy_key';
const genAI = new GoogleGenerativeAI(apiKey);

router.post('/generate', auth, async (req, res) => {
  try {
    const { prompt, model: requestedModel } = req.body;
    
    if (apiKey === 'dummy_key') {
      return res.status(400).json({ 
        message: 'GEMINI_API_KEY is missing in backend .env file. Please add your key to use the AI assistant.' 
      });
    }

    // List of fallback models in order of preference in case of 503 Service Unavailable
    const fallbackChain = [
      requestedModel || 'gemma-4-26b-a4b-it',
      'gemini-3.6-flash',
      'gemini-3.8-flash',
      'gemma-4-31b-it',
      'gemini-flash-lite-latest',
      'deep-research-preview-04-2026'
    ];

    let lastError = null;
    
    // Attempt generation, automatically falling back to older models if servers are busy
    for (const modelName of fallbackChain) {
      try {
        console.log(`[AI] Attempting generation with model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = await result.response.text();
        const htmlContent = marked(text);
        
        return res.json({ text, html: htmlContent, modelUsed: modelName });
      } catch (error) {
        lastError = error;
        console.warn(`[AI] Model ${modelName} failed:`, error.message);
        
        // For any API failure (500, 503, 404, 400, etc.), log it and automatically fall back to the next model
        console.log(`[AI] Model unavailable or failed (Status ${error.status || 'Unknown'}). Falling back...`);
        continue;
      }
    }

    // If we exhausted all models or hit a non-retryable error
    throw lastError;

  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ 
      message: 'All AI models are currently busy or unavailable. Please try again in a few moments.', 
      error: error.message 
    });
  }
});

module.exports = router;
