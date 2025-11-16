import { tool } from '../../src';

/**
 * Calculator tool example
 * Performs basic mathematical operations
 */

@tool({
  tool_name: 'calculate',
  tool_title: 'Calculator',
  tool_description: 'Perform basic mathematical calculations',
  tool_params: [
    {
      name: 'expression',
      type: 'string',
      description: 'Mathematical expression to evaluate (e.g., "2 + 3 * 4")',
      required: true
    }
  ]
})
export function calculate(expression: string): string {
  try {
    // Simple expression evaluator - be cautious with eval in production
    // This is a simplified example for demonstration
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');

    if (sanitized !== expression) {
      return 'Invalid characters in expression. Only numbers and basic operators (+, -, *, /) are allowed.';
    }

    // Use Function constructor instead of eval for better security
    const result = new Function('return ' + sanitized)();

    if (!isFinite(result)) {
      return 'Calculation resulted in an invalid value (Infinity or NaN).';
    }

    return `Result: ${result}`;
  } catch (error) {
    return `Error calculating expression: ${error}`;
  }
}