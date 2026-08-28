/**
 * WBF CLI - Command-line interface for WaysNX Business Framework
 * Provides developer tools for inspection, generation, and demonstration
 */

import { parseArgs } from './parseArgs';
import { doctor } from './commands/doctor';
import { list } from './commands/list';
import { show } from './commands/show';
import { make } from './commands/make';
import { register } from './commands/register';
import { createdemo } from './commands/createdemo';

export interface CLIResult {
  success: boolean;
  output: string;
  exitCode: number;
  error?: {
    type: string;
    message: string;
    context?: Record<string, any>;
  };
}

/**
 * Main CLI entry point
 */
export async function main(args: string[]): Promise<CLIResult> {
  try {
    const parsed = parseArgs(args);

    if (parsed.command === 'help' || parsed.command === '--help' || parsed.command === '-h') {
      return {
        success: true,
        output: getHelpText(),
        exitCode: 0,
      };
    }

    if (parsed.command === 'version' || parsed.command === '--version' || parsed.command === '-v') {
      return {
        success: true,
        output: getVersionText(),
        exitCode: 0,
      };
    }

    // Route to commands
    switch (parsed.command) {
      case 'doctor':
        return await doctor(parsed);
      case 'list':
        return await list(parsed);
      case 'show':
        return await show(parsed);
      case 'make':
        return await make(parsed);
      case 'register':
        return await register(parsed);
      case 'createdemo':
        return await createdemo(parsed);
      case '':
        return {
          success: true,
          output: getHelpText(),
          exitCode: 0,
        };
      default:
        return {
          success: false,
          output: `Unknown command: ${parsed.command}\n\nRun 'wbf help' for usage information.`,
          exitCode: 1,
          error: {
            type: 'UnknownCommand',
            message: `Command '${parsed.command}' not recognized`,
          },
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      output: `Error: ${message}`,
      exitCode: 1,
      error: {
        type: 'CLIError',
        message,
      },
    };
  }
}

function getHelpText(): string {
  return `WaysNX Business Framework (WBF) CLI

Usage:
  wbf <command> [options]

Commands:
  doctor               Verify WBF environment and configuration
  list [resource]      List WBF artifacts (modules, entities, functions, validations, workflows)
  show <type> <id>     Display details of a specific artifact
  make <type> <name>   Generate a new WBF artifact
  register <type> <id> Register a definition in the registry
  createdemo           Create and execute a complete WBF demonstration

Options:
  --help, -h           Show this help message
  --version, -v        Show version information
  --json               Output as JSON (where supported)

Examples:
  wbf doctor
  wbf list modules
  wbf show workflow audit-review
  wbf make entity Employee
  wbf register function HR.LEAVE.APPLY.APPLY_LEAVE
  wbf createdemo

Documentation:
  Run 'wbf doctor' to verify your WBF setup.
  Run 'wbf createdemo' to see a working example.
`;
}

function getVersionText(): string {
  return `WaysNX Business Framework (WBF) v0.4.0`;
}

export { parseArgs };
export type { ParsedArgs } from './parseArgs';
