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
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not found in environment variables');
      return res.status(500).json({ error: 'API configuration error' });
    }

    // Call Anthropic API
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are an AI assistant helping visitors learn about Richard Gross's professional background. Here's his complete resume information:

${context}

Instructions:
- Answer questions about Richard's experience, skills, and background
- Be conversational and helpful
- If asked about something not in the resume, politely redirect to contacting Richard directly
- Keep responses concise but informative
- Highlight relevant achievements and numbers when appropriate

User question: ${message}`
        }]
      })
    });

    if (!anthropicResponse.ok) {
      const errorData = await anthropicResponse.text();
      console.error('Anthropic API error:', anthropicResponse.status, errorData);
      
      if (anthropicResponse.status === 401) {
        return res.status(500).json({ error: 'API authentication failed' });
      } else if (anthropicResponse.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again in a moment.' });
      } else {
        return res.status(500).json({ error: 'AI service temporarily unavailable' });
      }
    }

    const data = await anthropicResponse.json();
    const aiResponse = data.content[0].text;

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
