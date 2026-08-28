/**
 * wbf make - Artifact generation command
 * Generates scaffolds for new WBF artifacts
 * Note: Generation is separate from registration
 */

import { CLIResult, ParsedArgs } from '../index';

export async function make(parsed: ParsedArgs): Promise<CLIResult> {
  try {
    const type = parsed.args[0];
    const name = parsed.args[1];

    if (!type || !name) {
      return {
        success: false,
        output: 'Usage: wbf make <type> <name>',
        exitCode: 1,
        error: {
          type: 'MissingArguments',
          message: 'Type and name required',
        },
      };
    }

    // Generate scaffold based on type
    let scaffold = '';

    switch (type.toLowerCase()) {
      case 'module':
        scaffold = generateModuleScaffold(name);
        break;
      case 'entity':
        scaffold = generateEntityScaffold(name);
        break;
      case 'function':
        scaffold = generateFunctionScaffold(name);
        break;
      case 'validation':
        scaffold = generateValidationScaffold(name);
        break;
      case 'workflow':
        scaffold = generateWorkflowScaffold(name);
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

    const output = `Generated ${type} scaffold:\n\n${scaffold}\n\nTo register this artifact, use:\n  wbf register ${type} <id>`;

    if (parsed.json) {
      return {
        success: true,
        output: JSON.stringify(
          {
            type,
            name,
            scaffold,
            nextStep: `Register with: wbf register ${type} <id>`,
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
      output: `Make command failed: ${message}`,
      exitCode: 1,
      error: {
        type: 'MakeError',
        message,
      },
    };
  }
}

function generateModuleScaffold(name: string): string {
  return `import { ModuleDefinition } from '@waysnx/business-framework';

export const ${name}Module = new ModuleDefinition({
  id: '${name.toUpperCase()}',
  name: '${name}',
  displayName: '${name}',
  description: 'Module description',
  status: 'Operate',
});`;
}

function generateEntityScaffold(name: string): string {
  return `import { EntityDefinition } from '@waysnx/business-framework';

export const ${name}Entity = new EntityDefinition({
  id: '${name.toUpperCase()}',
  name: '${name}',
  displayName: '${name}',
  description: 'Entity description',
  moduleId: 'MODULE_ID',
});`;
}

function generateFunctionScaffold(name: string): string {
  return `import { BusinessFunctionDefinition } from '@waysnx/business-framework';

export const ${name}Function = new BusinessFunctionDefinition({
  id: 'MODULE.DOMAIN.CAPABILITY.${name.toUpperCase()}',
  name: '${name}',
  displayName: '${name}',
  description: 'Function description',
  moduleId: 'MODULE_ID',
  domain: 'DOMAIN',
  capability: 'CAPABILITY',
  requestContract: { /* fields */ },
  responseContract: { /* fields */ },
});`;
}

function generateValidationScaffold(name: string): string {
  return `import { ValidationDefinition } from '@waysnx/business-framework';

export const ${name}Validation = new ValidationDefinition({
  id: '${name.toUpperCase()}',
  name: '${name}',
  displayName: '${name}',
  description: 'Validation description',
  moduleId: 'MODULE_ID',
  scope: 'ENTITY_TYPE',
  severity: 'error',
});`;
}

function generateWorkflowScaffold(name: string): string {
  return `import { WorkflowDefinition, WorkflowStep } from '@waysnx/business-framework';

const steps = [
  new WorkflowStep({
    id: 'step-1',
    sequence: 0,
    businessFunctionId: 'MODULE.DOMAIN.CAPABILITY.FUNCTION',
    displayName: 'Step 1',
  }),
];

export const ${name}Workflow = new WorkflowDefinition({
  id: '${name.toLowerCase()}',
  name: '${name}',
  displayName: '${name}',
  description: 'Workflow description',
  moduleId: 'MODULE_ID',
  steps,
});`;
}
