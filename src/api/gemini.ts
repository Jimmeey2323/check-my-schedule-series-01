import type { ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyAi5Rbe5dPf7cIO64bG8tbiVnoeVTYx-2k';
const MODEL_ID = 'gemini-2.5-pro';
const GENERATE_CONTENT_API = 'generateContent';

export async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk;
  });

  req.on('end', async () => {
    try {
      const { input } = JSON.parse(body);
      
      if (!input) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Input is required' }));
        return;
      }

      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: input },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:${GENERATE_CONTENT_API}?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', response.status, errorText);
        res.statusCode = response.status;
        res.end(JSON.stringify({ error: `Gemini API error: ${response.status}` }));
        return;
      }

      const result = await response.json();
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify(result));
    } catch (error) {
      console.error('Server error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }));
    }
  });
}

// Vite plugin for dev server
export function configureGeminiApi(server: ViteDevServer) {
  server.middlewares.use('/api/gemini', handler);
}
