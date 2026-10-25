// Thin client for Tavily's search API — server-side only. Used to ground
// LLM-generated ask suggestions in real, current search results instead of
// the model's memorized (and possibly stale) training data.

interface TavilyResult {
  title: string;
  url: string;
  content: string;
}

export async function webSearch(
  query: string,
  maxResults = 4,
): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        max_results: maxResults,
        search_depth: "basic",
      }),
    });

    if (!res.ok) {
      console.error(`Tavily search failed: ${res.status}`);
      return [];
    }

    const data = await res.json();
    return (data.results ?? []).map((r: TavilyResult) => ({
      title: r.title,
      url: r.url,
      content: r.content,
    }));
  } catch (err) {
    console.error("Tavily search error:", err);
    return [];
  }
}

/** Formats search results as grounding context to inject into an LLM prompt. */
export function formatSearchContext(
  results: { title: string; url: string; content: string }[],
): string {
  if (results.length === 0) return "";

  return results
    .map(
      (r, i) =>
        `[${i + 1}] ${r.title} (${r.url})\n${r.content.slice(0, 500)}`,
    )
    .join("\n\n");
}
