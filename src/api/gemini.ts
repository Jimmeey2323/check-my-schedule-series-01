import type { ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_ID = 'gemini-2.5-pro';
const GENERATE_CONTENT_API = 'streamGenerateContent';

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
          thinkingConfig: {
            thinkingBudget: -1,
          },
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
      const result = await response.json();
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(result));
    } catch (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}

// Vite plugin for dev server
export function configureGeminiApi(server: ViteDevServer) {
  server.middlewares.use('/api/gemini', handler);
}
