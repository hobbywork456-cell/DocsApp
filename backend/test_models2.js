const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testModels() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const genAI = new GoogleGenerativeAI(apiKey);
        console.log("Testing antigravity-preview-latest...");
        const model = genAI.getGenerativeModel({ model: 'antigravity-preview-latest' });
        const result = await model.generateContent('Say hello world');
        const text = await result.response.text();
        console.log("SUCCESS:", text);
    } catch(e) {
        console.log("FAILED:", e.message);
    }
}

testModels();
