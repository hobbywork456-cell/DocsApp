const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testGemma() {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    
    try {
        console.log("Testing gemma-4-31b-it...");
        const model = genAI.getGenerativeModel({ model: 'gemma-4-31b-it' });
        const result = await model.generateContent('Hi');
        console.log("SUCCESS:", await result.response.text());
    } catch(e) {
        console.log("FAILED:", e.message);
    }
}
testGemma();
