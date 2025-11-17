import 'dotenv/config'

const model = process.env.LLM_MODEL || 'gpt-4o-mini'

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export async function chat(messages: ChatMessage[], jsonMode = false): Promise<string> {
  const apiKey = process.env.LLM_API_KEY
  if (!apiKey) {
    const last = messages[messages.length - 1]?.content || ''
    return jsonMode ? JSON.stringify({ message: `LLM未配置: ${last}` }) : `LLM未配置: ${last}`
  }

  try {
    const baseUrl = process.env.LLM_BASE_URL || 'https://api.openai.com/v1'
    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`
    const body = {
      model,
      messages,
      ...(jsonMode && { response_format: { type: 'json_object' } }),
    } as any

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`LLM error ${res.status}: ${text}`)
    }

    const json: any = await res.json()
    const content = json.choices?.[0]?.message?.content || ''
    return content
  } catch (error) {
    const last = messages[messages.length - 1]?.content || ''
    return jsonMode
      ? JSON.stringify({
          message: `LLM错误: ${error instanceof Error ? error.message : String(error)}`,
        })
      : `LLM错误: ${error instanceof Error ? error.message : String(error)}`
  }
}

export async function chatRaw(
  messages: ChatMessage[],
  options?: { tools?: any[]; tool_choice?: 'auto' | 'none'; jsonMode?: boolean }
): Promise<any> {
  const apiKey = process.env.LLM_API_KEY
  if (!apiKey) {
    const last = messages[messages.length - 1]?.content || ''
    return {
      choices: [
        { message: { content: `LLM未配置: ${last}`, tool_calls: null }, finish_reason: 'stop' },
      ],
    }
  }

  const baseUrl = process.env.LLM_BASE_URL || 'https://api.openai.com/v1'
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`
  const body: any = {
    model,
    messages,
    ...(options?.jsonMode && { response_format: { type: 'json_object' } }),
    ...(options?.tools && { tools: options.tools, tool_choice: options.tool_choice || 'auto' }),
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    return {
      choices: [
        { message: { content: `LLM错误: ${text}`, tool_calls: null }, finish_reason: 'stop' },
      ],
    }
  }

  const json = await res.json()
  return json
}

// 保留向后兼容
export async function chatJSON(messages: ChatMessage[]): Promise<string> {
  return chat(messages, true)
}
