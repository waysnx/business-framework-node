/**
 * CLI Argument Parser
 * Parses command-line arguments into a structured format
 */

export interface ParsedArgs {
  command: string;
  args: string[];
  flags: Record<string, boolean | string>;
  json: boolean;
}

/**
 * Parse CLI arguments
 * @param args Raw command-line arguments (excluding node and script path)
 */
export function parseArgs(args: string[]): ParsedArgs {
  const flags: Record<string, boolean | string> = {};
  const positional: string[] = [];
  let command = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      // Long flag
      const eqIndex = arg.indexOf('=');
      if (eqIndex > 0) {
        const key = arg.substring(2, eqIndex);
        const value = arg.substring(eqIndex + 1);
        flags[key] = value;
      } else {
        const key = arg.substring(2);
        flags[key] = true;
        // Treat certain flags as commands if they are the first argument
        if (!command && (key === 'help' || key === 'version')) {
          command = arg;
        }
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      // Short flag
      const flag = arg.substring(1);
      flags[flag] = true;
      // Treat certain flags as commands if they are the first argument
      if (!command && (flag === 'h' || flag === 'v')) {
        command = arg;
      }
    } else {
      // Positional argument
      if (!command) {
        command = arg;
      } else {
        positional.push(arg);
      }
    }
  }

  return {
    command,
    args: positional,
    flags,
    json: flags.json === true || flags.json === '',
  };
}
