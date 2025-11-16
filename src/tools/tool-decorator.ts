/**
 * Decorator for creating tools with metadata
 */
export function tool(info: {
  tool_name: string;
  tool_title?: string;
  tool_description: string;
  tool_params: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
  }>;
}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    // Attach tool info to the function
    originalMethod.tool_info = info;

    descriptor.value = originalMethod;
    return descriptor;
  };
}

/**
 * Helper function to create a tool from a function
 */
export function createTool<T extends (...args: any[]) => any>(
  func: T,
  info: {
    tool_name: string;
    tool_title?: string;
    tool_description: string;
    tool_params: Array<{
      name: string;
      type: string;
      description: string;
      required: boolean;
    }>;
  }
): T {
  (func as any).tool_info = info;
  return func;
}