const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testModels() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        console.log("API Key found:", apiKey ? "Yes" : "No");
        
        // Try fetching with gemini-1.5-flash
        const genAI = new GoogleGenerativeAI(apiKey);
        try {
            console.log("Testing gemini-1.5-flash...");
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            await model.generateContent('Hi');
            console.log("gemini-1.5-flash SUCCESS");
        } catch(e) {
            console.log("gemini-1.5-flash FAILED:", e.message);
        }

        try {
            console.log("Testing gemini-1.5-flash-latest...");
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
            await model.generateContent('Hi');
            console.log("gemini-1.5-flash-latest SUCCESS");
        } catch(e) {
            console.log("gemini-1.5-flash-latest FAILED:", e.message);
        }

        try {
            console.log("Testing gemini-pro...");
            const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
            await model.generateContent('Hi');
            console.log("gemini-pro SUCCESS");
        } catch(e) {
            console.log("gemini-pro FAILED:", e.message);
        }
        
    } catch(e) {
        console.log("Global error:", e.message);
    }
}

testModels();
