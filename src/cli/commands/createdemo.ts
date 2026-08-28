/**
 * wbf createdemo - Complete WBF demonstration
 * Creates and executes a working end-to-end example using Hospital Audit domain
 * Demonstrates: Module → Entity → Business Functions → Validations → Workflow → Execution
 */

import { CLIResult, ParsedArgs } from '../index';
import { runAuditDemoAsync } from '../demo/auditDemo';

export async function createdemo(parsed: ParsedArgs): Promise<CLIResult> {
  try {
    // Run the audit demo
    const result = await runAuditDemoAsync();

    if (parsed.json) {
      return {
        success: result.success,
        output: JSON.stringify(result.json, null, 2),
        exitCode: result.success ? 0 : 1,
      };
    }

    return {
      success: result.success,
      output: result.output,
      exitCode: result.success ? 0 : 1,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      output: `Demo failed: ${message}`,
      exitCode: 1,
      error: {
        type: 'DemoError',
        message,
      },
    };
  }
}
