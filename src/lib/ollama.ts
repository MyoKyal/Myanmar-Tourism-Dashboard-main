// Local LLM client for the Decision Center's "AI Insight" feature -- calls a locally-running
// Ollama server instead of a paid hosted API, so the feature works entirely offline/free.
// Every caller must treat this as best-effort: Ollama may not be running, the model may not
// be pulled, or a request may simply time out, and none of that should ever break the
// underlying rules-based recommendation this augments.
//
// English only, deliberately. Tested this model's Burmese output directly and it produced
// incoherent text (not real Burmese) -- small local models generally don't have reliable
// coverage of low-resource languages like Burmese. Shipping garbled Burmese would be worse
// than not having a translation, so this returns plain English text and the UI labels it
// as such rather than pretending to localize it.

const OLLAMA_URL = process.env.OLLAMA_URL?.trim() || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL?.trim() || 'qwen2.5:1.5b';

export async function generateAiInsight(prompt: string): Promise<string | null> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        // Caps generation length so a request finishes in a few seconds instead of tens of
        // seconds -- this is a short-explanation feature, not an open-ended chat response.
        options: { temperature: 0.6, num_predict: 120 },
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const text = typeof data.response === 'string' ? data.response.trim() : '';
    return text || null;
  } catch {
    // Ollama not running, model not pulled, or request timed out -- all expected/recoverable,
    // not exceptional. Callers fall back silently.
    return null;
  }
}
