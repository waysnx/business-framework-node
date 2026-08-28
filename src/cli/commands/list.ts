/**
 * wbf list - Registry discovery command
 * Lists WBF artifacts from registries
 */

import {
  ModuleRegistry,
  EntityRegistry,
  BusinessFunctionRegistry,
  ValidationRegistry,
  WorkflowRegistry,
} from '../../registries';
import { CLIResult, ParsedArgs } from '../index';

export async function list(parsed: ParsedArgs): Promise<CLIResult> {
  try {
    const resource = parsed.args[0] || 'all';

    // Create registries with empty state (would be populated by application)
    const moduleRegistry = new ModuleRegistry();
    const entityRegistry = new EntityRegistry();
    const functionRegistry = new BusinessFunctionRegistry();
    const validationRegistry = new ValidationRegistry();
    const workflowRegistry = new WorkflowRegistry();

    let output = '';

    // Helper to format artifact list
    const formatArtifactList = (name: string, items: Map<string, any> | any[]): string => {
      const itemsArray = items instanceof Map ? Array.from(items.values()) : items;
      if (itemsArray.length === 0) {
        return `${name}: (none registered)\n`;
      }
      let result = `${name}:\n`;
      for (const item of itemsArray) {
        const id = item.id;
        const displayName = item.displayName || id;
        result += `  - ${id} (${displayName})\n`;
      }
      return result;
    };

    // List based on resource type
    if (resource === 'all' || resource === 'modules') {
      output += formatArtifactList('Modules', moduleRegistry.all());
    }

    if (resource === 'all' || resource === 'entities') {
      output += formatArtifactList('Entities', entityRegistry.all());
    }

    if (resource === 'all' || resource === 'functions') {
      output += formatArtifactList('Business Functions', functionRegistry.all());
    }

    if (resource === 'all' || resource === 'validations') {
      output += formatArtifactList('Validations', validationRegistry.all());
    }

    if (resource === 'all' || resource === 'workflows') {
      output += formatArtifactList('Workflows', workflowRegistry.all());
    }

    if (
      resource !== 'all' &&
      resource !== 'modules' &&
      resource !== 'entities' &&
      resource !== 'functions' &&
      resource !== 'validations' &&
      resource !== 'workflows'
    ) {
      return {
        success: false,
        output: `Unknown resource: ${resource}`,
        exitCode: 1,
        error: {
          type: 'UnknownResource',
          message: `Resource '${resource}' not recognized`,
        },
      };
    }

    if (parsed.json) {
      return {
        success: true,
        output: JSON.stringify(
          {
            modules: Array.from(moduleRegistry.all().values()),
            entities: Array.from(entityRegistry.all().values()),
            functions: Array.from(functionRegistry.all().values()),
            validations: Array.from(validationRegistry.all().values()),
            workflows: Array.from(workflowRegistry.all().values()),
          },
          null,
          2
        ),
        exitCode: 0,
      };
    }

    return {
      success: true,
      output: `\n${output}`,
      exitCode: 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      output: `List command failed: ${message}`,
      exitCode: 1,
      error: {
        type: 'ListError',
        message,
      },
    };
  }
}
