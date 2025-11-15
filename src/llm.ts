import "dotenv/config";

const model = process.env.LLM_MODEL || "gpt-4o-mini";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function chat(messages: ChatMessage[], jsonMode = false): Promise<string> {
  // Check if API key is configured
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    const last = messages[messages.length - 1]?.content || "";
    return jsonMode ? JSON.stringify({ message: `LLM未配置: ${last}` }) : `LLM未配置: ${last}`;
  }

  try {
    // Use native fetch for now since LLM.js URL construction is problematic
    const baseUrl = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
    
    const body = {
      model,
      messages,
      ...(jsonMode && { response_format: { type: "json_object" } })
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LLM error ${res.status}: ${text}`);
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content || "";
    
    return content;
  } catch (error) {
    console.error("LLM error:", error);
    const last = messages[messages.length - 1]?.content || "";
    return jsonMode 
      ? JSON.stringify({ message: `LLM错误: ${error instanceof Error ? error.message : String(error)}` })
      : `LLM错误: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// 保留向后兼容
export async function chatJSON(messages: ChatMessage[]): Promise<string> {
  return chat(messages, true);
}
