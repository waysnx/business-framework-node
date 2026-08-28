#!/usr/bin/env node

/**
 * WBF CLI - Command-line interface entry point
 * Executable: wbf
 */

import { main } from './index';

/**
 * Entry point for the wbf CLI
 */
async function run(): Promise<void> {
  // Get command-line arguments (skip node and script path)
  const args = process.argv.slice(2);

  // Run CLI
  const result = await main(args);

  // Output result
  process.stdout.write(result.output);
  if (!result.output.endsWith('\n')) {
    process.stdout.write('\n');
  }

  // Exit with appropriate code
  process.exit(result.exitCode);
}

// Run CLI
run().catch((error) => {
  process.stderr.write(`Fatal error: ${error.message}\n`);
  process.exit(1);
});
