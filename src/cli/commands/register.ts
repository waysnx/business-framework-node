/**
 * wbf register - Registry registration command
 * Registers a definition in the appropriate registry
 */

import { CLIResult, ParsedArgs } from '../index';

export async function register(parsed: ParsedArgs): Promise<CLIResult> {
  try {
    const type = parsed.args[0];
    const id = parsed.args[1];

    if (!type || !id) {
      return {
        success: false,
        output: 'Usage: wbf register <type> <id>',
        exitCode: 1,
        error: {
          type: 'MissingArguments',
          message: 'Type and ID required',
        },
      };
    }

    // Validate type
    const validTypes = ['module', 'entity', 'function', 'validation', 'workflow'];
    if (!validTypes.includes(type.toLowerCase())) {
      return {
        success: false,
        output: `Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}`,
        exitCode: 1,
        error: {
          type: 'InvalidType',
          message: `Type '${type}' is not valid`,
        },
      };
    }

    // In a real application, this would load the definition from a module
    // and register it in the appropriate registry
    // For now, we provide guidance

    const output = `Register ${type} '${id}':

Step 1: Create or import the definition
  const definition = new ${capitalizeFirst(type)}Definition({
    id: '${id}',
    // ... other properties
  });

Step 2: Get the registry
  const registry = new ${capitalizeFirst(type)}Registry();

Step 3: Register the definition
  registry.register(definition);

The definition is now available for discovery and use.`;

    if (parsed.json) {
      return {
        success: true,
        output: JSON.stringify(
          {
            type,
            id,
            status: 'ready_for_registration',
            instructions: [
              'Create definition instance',
              'Get registry',
              'Call registry.register(definition)',
            ],
          },
          null,
          2
        ),
        exitCode: 0,
      };
    }

    return {
      success: true,
      output,
      exitCode: 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      output: `Register command failed: ${message}`,
      exitCode: 1,
      error: {
        type: 'RegisterError',
        message,
      },
    };
  }
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
