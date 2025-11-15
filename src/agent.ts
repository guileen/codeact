import { chat } from "./llm";
import { runCode } from "./sandbox";
import { SYSTEM_PROMPT_4 } from "./prompt";
import { CodeBlock } from "./schemas";

type Msg = { role: "user" | "assistant" | "tool"; content: string };

const SupportedLanguage = ["bash", "javascript", "python"] as const;

export class Agent {
  private memory: Msg[] = [];

  async run(prompt: string): Promise<{ text: string }> {
    this.memory.push({ role: "user", content: prompt });
    const messages = [{ role: "system", content: SYSTEM_PROMPT_4 }, ...this.memory.map(m => ({ role: m.role === "tool" ? "assistant" : m.role, content: m.content }))];
    const raw = await chat(messages as any, false);
    console.log("Raw LLM response:", JSON.stringify(raw)); // Debug logging
    const extractedThink = raw.match(/<think>(.*?)<\/think>/s)?.[1] || "";
    const extractedCodes = (raw.match(/\`\`\`(.*?)\n(.*?)\`\`\`/gs) || []).map((match) => {
      const [_, language, code] = match.match(/\`\`\`(.*?)\n(.*?)\`\`\`/s) || ["", "", ""];
      return { language: language.trim(), code: code.trim() };
    }) as CodeBlock[];
    console.log("Extracted code blocks:", extractedCodes); // Debug logging
    
    // If we extracted code blocks, execute them and return the result
    if (extractedCodes.length > 0) {
      // Execute all code blocks
      let finalResult = "";
      for(const code of extractedCodes) {
        const result = await runCode(code);
        
        // Combine logs and output
        let resultText = "";
        if (result.logs.length > 0) {
          resultText += result.logs.join("\n");
        }
        if (result.output !== undefined) {
          resultText += (resultText ? "\n" : "") + 
                       (typeof result.output === "string" ? result.output : JSON.stringify(result.output));
        }
        
        this.memory.push({ role: "tool", content: String(resultText) });
        finalResult += resultText + "\n";
      }
      
      this.memory.push({ role: "assistant", content: finalResult.trim() });
      return { text: finalResult.trim() };
    }
    
    // If no code blocks were found, return the raw response
    this.memory.push({ role: "assistant", content: raw });
    return { text: raw };
  }
}
