const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        const validModels = data.models.filter(m => m.supportedGenerationMethods.includes('generateContent') && !m.name.includes('tts') && !m.name.includes('veo') && !m.name.includes('embedding') && !m.name.includes('lyria') && !m.name.includes('aqa'));
        console.log("Valid Models:");
        validModels.forEach(m => console.log(m.name, m.version));
    } catch(e) {
        console.log("Global error:", e.message);
    }
}

listModels();
