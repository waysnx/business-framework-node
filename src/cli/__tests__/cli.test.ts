/**
 * CLI Tests - Command routing, argument parsing, and command execution
 */

import { main, parseArgs } from '../index';
import { doctor } from '../commands/doctor';
import { list } from '../commands/list';
import { show } from '../commands/show';
import { make } from '../commands/make';
import { register } from '../commands/register';

describe('CLI - parseArgs', () => {
  test('should parse help flag', () => {
    const result = parseArgs(['help']);
    expect(result.command).toBe('help');
  });

  test('should parse --help flag', () => {
    const result = parseArgs(['--help']);
    expect(result.command).toBe('--help');
  });

  test('should parse -h flag', () => {
    const result = parseArgs(['-h']);
    expect(result.command).toBe('-h');
  });

  test('should parse command with arguments', () => {
    const result = parseArgs(['show', 'workflow', 'audit-review']);
    expect(result.command).toBe('show');
    expect(result.args).toEqual(['workflow', 'audit-review']);
  });

  test('should parse --json flag', () => {
    const result = parseArgs(['list', '--json']);
    expect(result.command).toBe('list');
    expect(result.json).toBe(true);
  });

  test('should parse flag with value', () => {
    const result = parseArgs(['list', '--type=module']);
    expect(result.flags.type).toBe('module');
  });

  test('should handle empty args', () => {
    const result = parseArgs([]);
    expect(result.command).toBe('');
    expect(result.args).toEqual([]);
  });

  test('should parse multiple positional arguments', () => {
    const result = parseArgs(['make', 'entity', 'Employee', 'extra']);
    expect(result.command).toBe('make');
    expect(result.args).toEqual(['entity', 'Employee', 'extra']);
  });
});

describe('CLI - doctor command', () => {
  test('should execute doctor command successfully', async () => {
    const result = await doctor({ command: 'doctor', args: [], flags: {}, json: false });
    expect(result.success).toBe(true);
    expect(result.exitCode).toBeGreaterThanOrEqual(0);
    expect(result.output).toContain('Doctor');
  });

  test('should contain Node version check', async () => {
    const result = await doctor({ command: 'doctor', args: [], flags: {}, json: false });
    expect(result.output).toContain('Node.js');
  });

  test('should support JSON output', async () => {
    const result = await doctor({ command: 'doctor', args: [], flags: {}, json: true });
    expect(result.output).toBeTruthy();
    const json = JSON.parse(result.output);
    expect(json.checks).toBeInstanceOf(Array);
    expect(json.summary).toBeDefined();
  });

  test('should list all checks in output', async () => {
    const result = await doctor({ command: 'doctor', args: [], flags: {}, json: false });
    expect(result.output).toContain('Environment Checks');
  });
});

describe('CLI - list command', () => {
  test('should execute list command successfully', async () => {
    const result = await list({ command: 'list', args: [], flags: {}, json: false });
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  test('should support JSON output', async () => {
    const result = await list({ command: 'list', args: [], flags: {}, json: true });
    const json = JSON.parse(result.output);
    expect(json.modules).toBeDefined();
    expect(json.entities).toBeDefined();
    expect(json.functions).toBeDefined();
  });

  test('should list modules', async () => {
    const result = await list({ command: 'list', args: ['modules'], flags: {}, json: false });
    expect(result.success).toBe(true);
    expect(result.output).toContain('Modules');
  });

  test('should list entities', async () => {
    const result = await list({ command: 'list', args: ['entities'], flags: {}, json: false });
    expect(result.success).toBe(true);
    expect(result.output).toContain('Entities');
  });

  test('should list functions', async () => {
    const result = await list({ command: 'list', args: ['functions'], flags: {}, json: false });
    expect(result.success).toBe(true);
    expect(result.output).toContain('Business Functions');
  });

  test('should reject unknown resource', async () => {
    const result = await list({ command: 'list', args: ['unknown'], flags: {}, json: false });
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });
});

describe('CLI - show command', () => {
  test('should fail without type argument', async () => {
    const result = await show({ command: 'show', args: [], flags: {}, json: false });
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  test('should fail without id argument', async () => {
    const result = await show({ command: 'show', args: ['module'], flags: {}, json: false });
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  test('should reject unknown type', async () => {
    const result = await show({ command: 'show', args: ['unknown', 'test'], flags: {}, json: false });
    expect(result.success).toBe(false);
    expect(result.output).toContain('Unknown type');
  });

  test('should handle not found artifact', async () => {
    const result = await show({ command: 'show', args: ['module', 'NOT_FOUND'], flags: {}, json: false });
    expect(result.success).toBe(false);
    expect(result.output).toContain('not found');
  });
});

describe('CLI - make command', () => {
  test('should fail without type argument', async () => {
    const result = await make({ command: 'make', args: [], flags: {}, json: false });
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  test('should fail without name argument', async () => {
    const result = await make({ command: 'make', args: ['entity'], flags: {}, json: false });
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  test('should generate module scaffold', async () => {
    const result = await make({ command: 'make', args: ['module', 'TestModule'], flags: {}, json: false });
    expect(result.success).toBe(true);
    expect(result.output).toContain('ModuleDefinition');
  });

  test('should generate entity scaffold', async () => {
    const result = await make({ command: 'make', args: ['entity', 'TestEntity'], flags: {}, json: false });
    expect(result.success).toBe(true);
    expect(result.output).toContain('EntityDefinition');
  });

  test('should generate function scaffold', async () => {
    const result = await make({ command: 'make', args: ['function', 'TestFunction'], flags: {}, json: false });
    expect(result.success).toBe(true);
    expect(result.output).toContain('BusinessFunctionDefinition');
  });

  test('should generate validation scaffold', async () => {
    const result = await make({ command: 'make', args: ['validation', 'TestValidation'], flags: {}, json: false });
    expect(result.success).toBe(true);
    expect(result.output).toContain('ValidationDefinition');
  });

  test('should generate workflow scaffold', async () => {
    const result = await make({ command: 'make', args: ['workflow', 'TestWorkflow'], flags: {}, json: false });
    expect(result.success).toBe(true);
    expect(result.output).toContain('WorkflowDefinition');
  });

  test('should provide register guidance in output', async () => {
    const result = await make({ command: 'make', args: ['entity', 'TestEntity'], flags: {}, json: false });
    expect(result.output).toContain('wbf register');
  });

  test('should support JSON output', async () => {
    const result = await make({ command: 'make', args: ['module', 'TestModule'], flags: {}, json: true });
    const json = JSON.parse(result.output);
    expect(json.type).toBe('module');
    expect(json.scaffold).toBeDefined();
  });

  test('should reject unknown type', async () => {
    const result = await make({ command: 'make', args: ['unknown', 'Test'], flags: {}, json: false });
    expect(result.success).toBe(false);
    expect(result.output).toContain('Unknown type');
  });
});

describe('CLI - register command', () => {
  test('should fail without type argument', async () => {
    const result = await register({ command: 'register', args: [], flags: {}, json: false });
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  test('should fail without id argument', async () => {
    const result = await register({ command: 'register', args: ['module'], flags: {}, json: false });
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  test('should provide registration guidance for module', async () => {
    const result = await register({ command: 'register', args: ['module', 'TEST_MODULE'], flags: {}, json: false });
    expect(result.success).toBe(true);
    expect(result.output).toContain('ModuleDefinition');
  });

  test('should provide registration guidance for entity', async () => {
    const result = await register({ command: 'register', args: ['entity', 'TEST_ENTITY'], flags: {}, json: false });
    expect(result.success).toBe(true);
    expect(result.output).toContain('EntityDefinition');
  });

  test('should reject invalid type', async () => {
    const result = await register({ command: 'register', args: ['invalid', 'TEST'], flags: {}, json: false });
    expect(result.success).toBe(false);
    expect(result.output).toContain('Invalid type');
  });

  test('should support JSON output', async () => {
    const result = await register({ command: 'register', args: ['module', 'TEST'], flags: {}, json: true });
    const json = JSON.parse(result.output);
    expect(json.type).toBe('module');
    expect(json.instructions).toBeDefined();
  });
});

describe('CLI - main router', () => {
  test('should show help for help command', async () => {
    const result = await main(['help']);
    expect(result.success).toBe(true);
    expect(result.output).toContain('Usage:');
  });

  test('should show help for --help flag', async () => {
    const result = await main(['--help']);
    expect(result.success).toBe(true);
    expect(result.output).toContain('Usage:');
  });

  test('should show help for -h flag', async () => {
    const result = await main(['-h']);
    expect(result.success).toBe(true);
    expect(result.output).toContain('Usage:');
  });

  test('should show version for --version flag', async () => {
    const result = await main(['--version']);
    expect(result.success).toBe(true);
    expect(result.output).toContain('v0.4.0');
  });

  test('should show version for -v flag', async () => {
    const result = await main(['-v']);
    expect(result.success).toBe(true);
    expect(result.output).toContain('v0.4.0');
  });

  test('should show help for empty arguments', async () => {
    const result = await main([]);
    expect(result.success).toBe(true);
    expect(result.output).toContain('Usage:');
  });

  test('should handle unknown command', async () => {
    const result = await main(['unknown-command']);
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBeDefined();
  });

  test('should route to doctor command', async () => {
    const result = await main(['doctor']);
    expect(result.success).toBe(true);
    expect(result.output).toContain('Environment Checks');
  });

  test('should route to list command', async () => {
    const result = await main(['list']);
    expect(result.success).toBe(true);
  });

  test('should route to make command', async () => {
    const result = await main(['make', 'module', 'Test']);
    expect(result.success).toBe(true);
    expect(result.output).toContain('ModuleDefinition');
  });
});
