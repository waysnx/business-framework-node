/**
 * CREATEDemo Tests - Hospital Audit demonstration execution
 */

import { runAuditDemoAsync } from '../demo/auditDemo';
import { createdemo } from '../commands/createdemo';

describe('Demo - Audit Demo', () => {
  test('should run audit demo successfully', async () => {
    const result = await runAuditDemoAsync();
    expect(result.success).toBe(true);
    expect(result.output).toBeTruthy();
  });

  test('should include module in output', async () => {
    const result = await runAuditDemoAsync();
    expect(result.output).toContain('Hospital Audit Management');
  });

  test('should include entity in output', async () => {
    const result = await runAuditDemoAsync();
    expect(result.output).toContain('Audit');
  });

  test('should demonstrate three business functions', async () => {
    const result = await runAuditDemoAsync();
    expect(result.output).toContain('Validate Audit');
    expect(result.output).toContain('Record Finding');
    expect(result.output).toContain('Complete Audit');
  });

  test('should show workflow with steps', async () => {
    const result = await runAuditDemoAsync();
    expect(result.output).toContain('Workflow');
    expect(result.output).toContain('steps');
  });

  test('should show execution result', async () => {
    const result = await runAuditDemoAsync();
    expect(result.output).toContain('WORKFLOW EXECUTION RESULT');
  });

  test('should include summary section', async () => {
    const result = await runAuditDemoAsync();
    expect(result.output).toContain('SUMMARY');
  });

  test('should include JSON output', async () => {
    const result = await runAuditDemoAsync();
    expect(result.json).toBeDefined();
    expect(result.json.success).toBe(true);
  });

  test('should have valid JSON structure', async () => {
    const result = await runAuditDemoAsync();
    expect(result.json.demo).toBeDefined();
    expect(result.json.artifacts).toBeDefined();
    expect(result.json.execution).toBeDefined();
  });

  test('should include all artifact types in JSON', async () => {
    const result = await runAuditDemoAsync();
    expect(result.json.artifacts.module).toBeDefined();
    expect(result.json.artifacts.entities).toBeDefined();
    expect(result.json.artifacts.businessFunctions).toBeDefined();
    expect(result.json.artifacts.validations).toBeDefined();
    expect(result.json.artifacts.workflow).toBeDefined();
  });

  test('should have correct execution structure in JSON', async () => {
    const result = await runAuditDemoAsync();
    const exec = result.json.execution;
    expect(exec.executionId).toBeDefined();
    expect(exec.workflowId).toBe('audit-review');
    expect(exec.status).toBeDefined();
    expect(exec.completedSteps).toBeInstanceOf(Array);
  });

  test('should demonstrate lifecycle concepts', async () => {
    const result = await runAuditDemoAsync();
    expect(result.output).toContain('Lifecycle');
  });

  test('should demonstrate validation concepts', async () => {
    const result = await runAuditDemoAsync();
    expect(result.output).toContain('Validation');
  });

  test('should show registry discovery', async () => {
    const result = await runAuditDemoAsync();
    expect(result.output).toContain('DISCOVERING');
  });

  test('should demonstrate all WBF concepts', async () => {
    const result = await runAuditDemoAsync();
    expect(result.output).toContain('Business-First');
    expect(result.output).toContain('Explicit Business Functions');
    expect(result.output).toContain('Workflow Orchestration');
  });
});

describe('Demo - createdemo command', () => {
  test('should execute createdemo command successfully', async () => {
    const result = await createdemo({ command: 'createdemo', args: [], flags: {}, json: false });
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  test('should output human-readable format', async () => {
    const result = await createdemo({ command: 'createdemo', args: [], flags: {}, json: false });
    expect(result.output).toContain('Hospital Audit');
  });

  test('should support JSON output', async () => {
    const result = await createdemo({ command: 'createdemo', args: [], flags: {}, json: true });
    expect(result.success).toBe(true);
    const json = JSON.parse(result.output);
    expect(json.demo).toBeDefined();
  });

  test('should exit with code 0 on success', async () => {
    const result = await createdemo({ command: 'createdemo', args: [], flags: {}, json: false });
    expect(result.exitCode).toBe(0);
  });

  test('should produce non-empty output', async () => {
    const result = await createdemo({ command: 'createdemo', args: [], flags: {}, json: false });
    expect(result.output.length).toBeGreaterThan(0);
  });

  test('should include success indicator', async () => {
    const result = await createdemo({ command: 'createdemo', args: [], flags: {}, json: false });
    expect(result.output).toContain('COMPLETED');
  });
});

describe('Demo - Audit Demo Error Handling', () => {
  test('should not throw on execution', async () => {
    expect(async () => {
      await runAuditDemoAsync();
    }).not.toThrow();
  });

  test('should provide error details if demo fails', async () => {
    const result = await runAuditDemoAsync();
    // Even if it fails, should have error info
    if (!result.success) {
      expect(result.json.error).toBeDefined();
    }
  });

  test('should always return valid result object', async () => {
    const result = await runAuditDemoAsync();
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('output');
    expect(result).toHaveProperty('json');
  });
});

describe('Demo - WBF Concepts Coverage', () => {
  test('should demonstrate Module concept', async () => {
    const result = await runAuditDemoAsync();
    expect(result.json.artifacts.module).toBeDefined();
    expect(result.json.artifacts.module.id).toBe('AUDIT');
  });

  test('should demonstrate Entity concept', async () => {
    const result = await runAuditDemoAsync();
    expect(result.json.artifacts.entities.length).toBeGreaterThan(0);
  });

  test('should demonstrate BusinessFunction concept', async () => {
    const result = await runAuditDemoAsync();
    expect(result.json.artifacts.businessFunctions.length).toBe(3);
  });

  test('should demonstrate Validation concept', async () => {
    const result = await runAuditDemoAsync();
    expect(result.json.artifacts.validations.length).toBeGreaterThan(0);
  });

  test('should demonstrate Workflow concept', async () => {
    const result = await runAuditDemoAsync();
    expect(result.json.artifacts.workflow).toBeDefined();
    expect(result.json.artifacts.workflow.steps).toBe(3);
  });

  test('should demonstrate Execution concept', async () => {
    const result = await runAuditDemoAsync();
    expect(result.json.execution.status).toBeDefined();
    expect(result.json.execution.completedSteps.length).toBeGreaterThan(0);
  });

  test('should demonstrate Registry concept', async () => {
    const result = await runAuditDemoAsync();
    expect(result.output).toContain('Registered');
  });

  test('should demonstrate Discovery concept', async () => {
    const result = await runAuditDemoAsync();
    expect(result.output).toContain('DISCOVERING');
  });
});
