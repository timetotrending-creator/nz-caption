// Netlify Function: Secure Groq API Proxy with Daily Limit
// This runs on Netlify's server — API key stays hidden!

const DAILY_LIMIT_FREE = 2; // Free users: 2 videos per day

// Simple in-memory store (resets on function cold start)
// For production scale, use Netlify Blobs or external DB
const usageStore = {};

function getTodayKey() {
  return new Date().toISOString().split('T')[0]; // "2026-05-18"
}

function checkAndIncrementUsage(userId) {
  const today = getTodayKey();
  const key = `${userId}_${today}`;

  if (!usageStore[key]) {
    usageStore[key] = 0;
  }

  if (usageStore[key] >= DAILY_LIMIT_FREE) {
    return { allowed: false, used: usageStore[key], limit: DAILY_LIMIT_FREE };
  }

  usageStore[key]++;
  return { allowed: true, used: usageStore[key], limit: DAILY_LIMIT_FREE };
}

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Get API key from environment variable (set in Netlify dashboard)
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server not configured. Admin: set GROQ_API_KEY environment variable.' })
    };
  }

  try {
    // Parse multipart body
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Expected multipart/form-data' }) };
    }

    // Get userId from query string (browser fingerprint)
    const userId = event.queryStringParameters?.userId || 'anonymous';

    // Check usage limit
    const usage = checkAndIncrementUsage(userId);
    if (!usage.allowed) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          error: 'daily_limit_reached',
          message: `You've used your ${usage.limit} free transcriptions for today. Upgrade to Pro for unlimited captions!`,
          used: usage.used,
          limit: usage.limit
        })
      };
    }

    // Forward request to Groq with our API key
    const bodyBuffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');

    const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': contentType
      },
      body: bodyBuffer
    });

    const responseText = await groqResponse.text();

    if (!groqResponse.ok) {
      return {
        statusCode: groqResponse.status,
        headers,
        body: responseText
      };
    }

    // Add usage info to response
    const result = JSON.parse(responseText);
    result._usage = { used: usage.used, limit: usage.limit, remaining: usage.limit - usage.used };

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server error: ' + err.message })
    };
  }
};
