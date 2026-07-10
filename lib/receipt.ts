// Receipt "OCR" via Gemini vision — one multimodal call, no OCR library.

export type ReceiptGuess = {
  amount: number | null;
  merchant: string | null;
  date: string | null;     // YYYY-MM-DD
  category: string | null; // one of the app's categories
};

const PROMPT = `You are reading a photo of a Malaysian receipt, bill, or payment screenshot
(Touch 'n Go, bank app, restaurant receipt, etc). Extract and return ONLY minified JSON,
no markdown, exactly this shape:
{"amount": <total paid as number, MYR>, "merchant": "<shop/payee name>", "date": "<YYYY-MM-DD or null>", "category": "<one of: Food, Transport, Groceries, Bills, Shopping, Health, Fun, Other>"}
Use null for anything you cannot read confidently.`;

// Pure: pull the JSON out of a model reply (handles ```json fences and chatter). Tested.
export function parseReceiptReply(text: string): ReceiptGuess {
  const empty: ReceiptGuess = { amount: null, merchant: null, date: null, category: null };
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return empty;
  try {
    const j = JSON.parse(match[0]);
    return {
      amount: typeof j.amount === "number" && j.amount > 0 ? j.amount : null,
      merchant: typeof j.merchant === "string" && j.merchant ? j.merchant : null,
      date: typeof j.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(j.date) ? j.date : null,
      category: typeof j.category === "string" && j.category ? j.category : null,
    };
  } catch {
    return empty;
  }
}

export async function scanReceiptImage(bytes: ArrayBuffer, mimeType: string): Promise<ReceiptGuess | { error: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { error: "No GEMINI_API_KEY set — add a free key from aistudio.google.com to enable receipt scanning." };
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + key,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: mimeType, data: Buffer.from(bytes).toString("base64") } },
          ],
        }],
      }),
      cache: "no-store",
    },
  );
  if (!res.ok) return { error: `Scan failed (${res.status}) — check GEMINI_API_KEY / quota.` };
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return parseReceiptReply(text);
}
