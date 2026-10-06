const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function findWorkingModel() {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const modelsToTest = [
        'gemini-2.5-pro',
        'gemini-pro-latest',
        'gemini-3.5-flash',
        'gemini-3.6-flash',
        'gemini-3.7-flash',
        'deep-research-preview-04-2026',
        'antigravity-preview-latest'
    ];
    
    for (const modelName of modelsToTest) {
        try {
            console.log(`Testing ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Hi');
            const text = await result.response.text();
            console.log(`✅ SUCCESS with ${modelName}:`, text);
            return; // Stop on first success
        } catch(e) {
            console.log(`❌ FAILED ${modelName}:`, e.message);
        }
    }
}

findWorkingModel();
