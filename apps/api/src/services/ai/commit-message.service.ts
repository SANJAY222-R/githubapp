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
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`AI request failed: ${res.status}`);
  const data = await res.json() as { content: Array<{ text: string }> };
  return data.content[0]?.text ?? "";
}

export async function generateCommitMessage(diff: string): Promise<string> {
  return callAI(
    `Write a concise conventional commit message (imperative mood, ≤72 chars, no period) for this diff:\n\n${diff.slice(0, 3000)}`
  );
}
