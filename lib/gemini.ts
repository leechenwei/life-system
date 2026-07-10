// Single Gemini REST helper shared by the Advisor and receipt scanner.
// Tries models newest-first: free-tier quota moves to newer models over time,
// so a 429/404 on one model falls through to the next instead of failing.
const MODELS = [
  process.env.GEMINI_MODEL, // optional override, tried first
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.0-flash",
].filter(Boolean) as string[];

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

export async function geminiGenerate(parts: Part[]): Promise<{ text: string } | { error: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return { error: "No GEMINI_API_KEY set — add a free key from aistudio.google.com to .env.local (and Vercel)." };
  }
  let lastStatus = 0;
  for (const model of MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts }] }),
        cache: "no-store",
      },
    );
    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return { text: text.trim() };
      lastStatus = 200; // ok but empty — try next model
      continue;
    }
    lastStatus = res.status;
    // 429 (quota) / 404 (model gone) -> try the next model; anything else is fatal.
    if (res.status !== 429 && res.status !== 404) break;
  }
  return {
    error: `AI request failed (${lastStatus}) on all models [${MODELS.join(", ")}]. Check GEMINI_API_KEY quota at aistudio.google.com.`,
  };
}
