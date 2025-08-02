// api/chat.js - Vercel serverless function
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get API key from environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY not found in environment variables');
      return res.status(500).json({ error: 'API configuration error' });
    }

    // Call Google Gemini API
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are an AI assistant helping visitors learn about Richard Gross's professional background. Here's his complete resume information:

${context}

Instructions:
- Answer questions about Richard's experience, skills, and background
- Be conversational and helpful
- If asked about something not in the resume, politely redirect to contacting Richard directly
- Keep responses concise but informative
- Highlight relevant achievements and numbers when appropriate

User question: ${message}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1000,
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorData);
      
      if (geminiResponse.status === 401) {
        return res.status(500).json({ error: 'API authentication failed' });
      } else if (geminiResponse.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again in a moment.' });
      } else {
        return res.status(500).json({ error: 'AI service temporarily unavailable' });
      }
    }

    const data = await geminiResponse.json();
    const aiResponse = data.candidates[0].content.parts[0].text;

    return res.status(200).json({ 
      response: aiResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Please try again or contact Richard directly'
    });
  }
}
