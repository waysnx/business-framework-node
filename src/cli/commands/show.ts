/**
 * wbf show - Artifact inspection command
 * Displays details of a specific WBF artifact
 */

import {
  ModuleRegistry,
  EntityRegistry,
  BusinessFunctionRegistry,
  ValidationRegistry,
  WorkflowRegistry,
} from '../../registries';
import { CLIResult, ParsedArgs } from '../index';

export async function show(parsed: ParsedArgs): Promise<CLIResult> {
  try {
    const type = parsed.args[0];
    const id = parsed.args[1];

    if (!type || !id) {
      return {
        success: false,
        output: 'Usage: wbf show <type> <id>',
        exitCode: 1,
        error: {
          type: 'MissingArguments',
          message: 'Type and ID required',
        },
      };
    }

    // Create registries with empty state
    const moduleRegistry = new ModuleRegistry();
    const entityRegistry = new EntityRegistry();
    const functionRegistry = new BusinessFunctionRegistry();
    const validationRegistry = new ValidationRegistry();
    const workflowRegistry = new WorkflowRegistry();

    let artifact = null;

    // Find artifact by type
    switch (type.toLowerCase()) {
      case 'module':
        artifact = moduleRegistry.findById(id);
        break;
      case 'entity':
        artifact = entityRegistry.findById(id);
        break;
      case 'function':
        artifact = functionRegistry.findById(id);
        break;
      case 'validation':
        artifact = validationRegistry.findById(id);
        break;
      case 'workflow':
        artifact = workflowRegistry.findById(id);
        break;
      default:
        return {
          success: false,
          output: `Unknown type: ${type}`,
          exitCode: 1,
          error: {
            type: 'UnknownType',
            message: `Type '${type}' not recognized`,
          },
        };
    }

    if (!artifact) {
      return {
        success: false,
        output: `${type} '${id}' not found`,
        exitCode: 1,
        error: {
          type: 'NotFound',
          message: `${type} with ID '${id}' not found in registry`,
        },
      };
    }

    // Format output
    const formatArtifact = (art: any, artifactType: string): string => {
      let output = `\n=== ${artifactType}: ${id} ===\n\n`;

      // Try to get common properties
      if (art.getDisplayName) {
        output += `Display Name: ${art.getDisplayName()}\n`;
      }
      if (art.getName) {
        output += `Name: ${art.getName()}\n`;
      }
      if (art.getDescription) {
        output += `Description: ${art.getDescription()}\n`;
      }
      if (art.getVersion) {
        output += `Version: ${art.getVersion()}\n`;
      }

      // Serialize to object if available
      if (art.toObject) {
        const obj = art.toObject();
        output += '\nProperties:\n';
        for (const [key, value] of Object.entries(obj)) {
          output += `  ${key}: ${JSON.stringify(value)}\n`;
        }
      }

      return output;
    };

    const output = formatArtifact(artifact, type);

    if (parsed.json) {
      const obj = artifact.toObject ? artifact.toObject() : artifact;
      return {
        success: true,
        output: JSON.stringify(obj, null, 2),
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
      output: `Show command failed: ${message}`,
      exitCode: 1,
      error: {
        type: 'ShowError',
        message,
      },
    };
  }
}
