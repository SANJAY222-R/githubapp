import { env } from "../../config/env.js";

async function callAI(prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.AI_PROVIDER_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`AI request failed: ${res.status}`);
  const data = await res.json() as { content: Array<{ text: string }> };
  return data.content[0]?.text ?? "";
}

export async function generatePrSummary(title: string, diff: string): Promise<string> {
  return callAI(
    `Summarize this pull request in 2-3 sentences for a developer audience.\nTitle: ${title}\n\nDiff (truncated):\n${diff.slice(0, 3000)}`
  );
}
