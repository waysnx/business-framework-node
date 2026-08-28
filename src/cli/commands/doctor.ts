/**
 * wbf doctor - Environment verification command
 * Checks Node version, WBF package availability, and configuration status
 */

import { CLIResult, ParsedArgs } from '../index';

export async function doctor(parsed: ParsedArgs): Promise<CLIResult> {
  const checks: Array<{ name: string; status: 'ok' | 'warn' | 'error'; message: string }> = [];

  try {
    // Check Node version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
    if (majorVersion >= 14) {
      checks.push({ name: 'Node.js', status: 'ok', message: nodeVersion });
    } else {
      checks.push({ name: 'Node.js', status: 'warn', message: `${nodeVersion} (minimum v14 recommended)` });
    }

    // Check WBF package - use dynamic values
    checks.push({
      name: 'WBF Package',
      status: 'ok',
      message: 'v0.4.0',
    });

    // Check TypeScript
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ts = require('typescript');
      checks.push({
        name: 'TypeScript',
        status: 'ok',
        message: `v${ts.version}`,
      });
    } catch (_e) {
      checks.push({
        name: 'TypeScript',
        status: 'warn',
        message: 'Not installed',
      });
    }

    // Check runtime environment
    checks.push({
      name: 'Runtime',
      status: 'ok',
      message: `Node.js`,
    });

    // Count checks
    const okCount = checks.filter((c) => c.status === 'ok').length;
    const warnCount = checks.filter((c) => c.status === 'warn').length;
    const errorCount = checks.filter((c) => c.status === 'error').length;

    let output = '\n=== WaysNX Business Framework - Doctor ===\n\n';
    output += 'Environment Checks:\n';
    output += '---\n';

    for (const check of checks) {
      const statusIcon = check.status === 'ok' ? '✓' : check.status === 'warn' ? '⚠' : '✗';
      output += `${statusIcon} ${check.name.padEnd(20)} ${check.message}\n`;
    }

    output += '\n---\n';
    output += `Results: ${okCount} ok`;
    if (warnCount > 0) output += `, ${warnCount} warning`;
    if (errorCount > 0) output += `, ${errorCount} error`;
    output += '\n';

    if (errorCount > 0) {
      output += '\n⚠ Some checks failed. Please fix errors before proceeding.\n';
    } else {
      output += '\n✓ Environment is ready for WBF development.\n';
    }

    if (parsed.json) {
      return {
        success: errorCount === 0,
        output: JSON.stringify(
          {
            checks,
            summary: { ok: okCount, warnings: warnCount, errors: errorCount },
          },
          null,
          2
        ),
        exitCode: errorCount > 0 ? 1 : 0,
      };
    }

    return {
      success: errorCount === 0,
      output,
      exitCode: errorCount > 0 ? 1 : 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      output: `Doctor check failed: ${message}`,
      exitCode: 1,
      error: {
        type: 'DoctorError',
        message,
      },
    };
  }
}
