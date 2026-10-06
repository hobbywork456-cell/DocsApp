const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function bruteForceModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        
        // Filter out obviously non-text models
        const validModels = data.models.filter(m => 
            m.supportedGenerationMethods.includes('generateContent') && 
            !m.name.includes('tts') && 
            !m.name.includes('veo') && 
            !m.name.includes('embedding') && 
            !m.name.includes('lyria') && 
            !m.name.includes('aqa')
        ).map(m => m.name.replace('models/', ''));

        console.log(`Found ${validModels.length} potential models.`);
        
        for (const modelName of validModels) {
            try {
                console.log(`[TESTING] ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent('Hi');
                const text = await result.response.text();
                console.log(`✅ [SUCCESS] ${modelName}:`, text);
                
                // Save this model as the ONLY fallback to use right now
                const fs = require('fs');
                fs.writeFileSync('working_model.txt', modelName);
                return;
            } catch(e) {
                console.log(`❌ [FAILED] ${modelName}:`, e.message);
            }
        }
        
        console.log("No working models found at all.");
    } catch(e) {
        console.log("Error fetching model list:", e.message);
    }
}

bruteForceModels();
