export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing OPENROUTER_API_KEY in Vercel Environment Variables." });
  }

  try {
    const { messages, temperature = 0.1, model = "google/gemini-2.5-flash" } = req.body || {};
    if (!messages) {
      return res.status(400).json({ error: "Missing messages." });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": req.headers.origin || "https://vercel.app",
        "X-Title": "Economics Question Bank"
      },
      body: JSON.stringify({
        model,
        messages,
        temperature
      })
    });

    const text = await response.text();
    if (!response.ok) {
      return res.status(response.status).send(text);
    }

    const data = JSON.parse(text);
    const content = data.choices?.[0]?.message?.content || "";
    return res.status(200).json({ content, raw: data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
