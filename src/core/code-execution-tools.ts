import { createTool } from '../tools/tool-decorator';
import { runCode } from '../shared/sandbox';
import { CodeBlock } from '../shared/schemas';

/**
 * Execute code in a sandboxed environment
 */
async function executeCode(language: string, code: string): Promise<string> {
  try {
    const codeBlock: CodeBlock = {
      language: language.toLowerCase(),
      code
    };

    const result = await runCode(codeBlock);

    // Format the output
    let output = '';
    if (result.logs && result.logs.length > 0) {
      output += 'Logs:\n' + result.logs.join('\n') + '\n';
    }
    if (result.output !== undefined) {
      output += 'Output:\n' + String(result.output);
    }

    return output || 'Code executed successfully with no output';
  } catch (error) {
    return `Error executing ${language} code: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// Create tools for different languages
export const bashTool = createTool(executeCode, {
  tool_name: 'bash',
  tool_description: 'Execute bash commands in a sandboxed environment',
  tool_params: [
    {
      name: 'language',
      type: 'string',
      description: 'Programming language (always "bash")',
      required: true
    },
    {
      name: 'code',
      type: 'string',
      description: 'Bash command to execute',
      required: true
    }
  ]
});

export const javascriptTool = createTool(executeCode, {
  tool_name: 'javascript',
  tool_description: 'Execute JavaScript code in a sandboxed environment',
  tool_params: [
    {
      name: 'language',
      type: 'string',
      description: 'Programming language (always "javascript")',
      required: true
    },
    {
      name: 'code',
      type: 'string',
      description: 'JavaScript code to execute',
      required: true
    }
  ]
});

export const pythonTool = createTool(executeCode, {
  tool_name: 'python',
  tool_description: 'Execute Python code in a sandboxed environment',
  tool_params: [
    {
      name: 'language',
      type: 'string',
      description: 'Programming language (always "python")',
      required: true
    },
    {
      name: 'code',
      type: 'string',
      description: 'Python code to execute',
      required: true
    }
  ]
});

// Export all tools as an array for easy registration
export const codeExecutionTools = [bashTool, javascriptTool, pythonTool];
