export const GEMINI_CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
];

export function getEffectiveGeminiApiKey(customKey?: string): string | undefined {
  if (customKey && customKey.trim()) return customKey.trim();
  const localKey = localStorage.getItem('GEMINI_API_KEY')?.trim();
  if (localKey) return localKey;
  const envKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim();
  if (envKey && !envKey.startsWith('AQ.')) return envKey;
  return undefined;
}

export interface GeminiCallOptions {
  customApiKey?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Calls Gemini with model fallback and exponential backoff on 429 rate limits.
 * Throws 'NO_API_KEY' if no API key is configured.
 */
export async function callGeminiWithFallback(
  prompt: string,
  options: GeminiCallOptions = {}
): Promise<string> {
  const apiKey = getEffectiveGeminiApiKey(options.customApiKey);
  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

  const { temperature = 0.2, maxOutputTokens } = options;
  let lastErrorMsg = '';

  for (const model of GEMINI_CANDIDATE_MODELS) {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      try {
        const generationConfig: Record<string, number> = { temperature };
        if (maxOutputTokens !== undefined) {
          generationConfig.maxOutputTokens = maxOutputTokens;
        }

        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          if (text) return text;
          break;
        }

        const errorData = await res.json().catch(() => null);
        const errorMsg = errorData?.error?.message || res.statusText || `HTTP ${res.status}`;
        lastErrorMsg = errorMsg;

        if (res.status === 429) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((r) => setTimeout(r, delay));
          attempt++;
          continue;
        }

        if (res.status === 404 || errorMsg.includes('not found') || errorMsg.includes('not supported')) {
          break;
        }

        throw new Error(errorMsg);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        lastErrorMsg = errMsg;
        if (errMsg.includes('API key') || errMsg.includes('API_KEY')) {
          throw err;
        }
        break;
      }
    }
  }

  throw new Error(lastErrorMsg || 'Failed to communicate with Gemini API. Please check your key.');
}
