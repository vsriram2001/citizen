// Thin client for the org's LLM gateway (OpenAI-compatible
// /v1/chat/completions). Server-side only — never import into client code.

// "default" does the careful work (drafting asks, finding who's
// responsible, feasibility); "fast" is for calls on the typing path, like
// matching a search query by meaning, where a second's latency shows.
const MODELS = {
  default: process.env.LLM_MODEL ?? "claude-opus-5-5",
  fast: process.env.LLM_FAST_MODEL ?? "claude-haiku-5-5",
} as const;

export async function chatJSON<T>(params: {
  system: string;
  user: string;
  model?: keyof typeof MODELS;
  /** Defaults to 1500. These models think invisibly first and that counts
   *  against the budget, so leave headroom beyond the visible answer. */
  maxTokens?: number;
  /** Cancels the request, e.g. when the person navigates away mid-suggest. */
  signal?: AbortSignal;
}): Promise<T> {
  const baseUrl = process.env.TRUEFOUNDRY_BASE_URL!;
  const apiKey = process.env.TRUEFOUNDRY_API_KEY!;

  const startedAt = Date.now();
  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: params.signal,
    body: JSON.stringify({
      model: MODELS[params.model ?? "default"],
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
      max_tokens: params.maxTokens ?? 1500,
    }),
  });

  if (!res.ok) {
    throw new Error(`LLM gateway ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const content: string = data.choices[0].message.content;
  // Latency is the product here (see the suggest flow), so every call says
  // how long it took and how much it read/wrote — output tokens dominate.
  console.log(
    `[llm] ${MODELS[params.model ?? "default"]} ${Date.now() - startedAt}ms in=${data.usage?.prompt_tokens} out=${data.usage?.completion_tokens}`,
  );

  // Models sometimes wrap JSON in a ```json fence despite instructions not to.
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : content;

  return JSON.parse(raw) as T;
}
