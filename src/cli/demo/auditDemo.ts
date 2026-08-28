/**
 * Hospital Audit Demo
 * Complete end-to-end WBF demonstration using Hospital Audit Management domain
 * Demonstrates all WBF layers: Definitions → Registries → Runtime → Workflow → Results
 */

import {
  ModuleDefinition,
  EntityDefinition,
  BusinessFunctionDefinition,
  ValidationDefinition,
  WorkflowDefinition,
  WorkflowStep,
} from '../../definitions';
import {
  ModuleRegistry,
  EntityRegistry,
  BusinessFunctionRegistry,
  ValidationRegistry,
  WorkflowRegistry,
} from '../../registries';
import {
  BusinessFunctionRuntime,
  LifecycleManager,
  WorkflowEngine,
  WorkflowContext,
} from '../../runtime';

export interface DemoResult {
  success: boolean;
  output: string;
  json: any;
}

/**
 * Run the complete audit demo asynchronously
 */
export async function runAuditDemoAsync(): Promise<DemoResult> {
  try {
    const result = await runAuditDemo();
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      output: `Demo execution failed: ${message}`,
      json: { error: message, success: false },
    };
  }
}

/**
 * Main audit demo implementation
 */
async function runAuditDemo(): Promise<DemoResult> {
  let output = '\n';
  output += '╔════════════════════════════════════════════════════════════════╗\n';
  output += '║  WaysNX Business Framework - Complete Demonstration            ║\n';
  output += '║  Hospital Audit Management Example                            ║\n';
  output += '╚════════════════════════════════════════════════════════════════╝\n\n';

  // ========== PHASE 1: Define Artifacts ==========
  output += '📋 PHASE 1: DEFINING WBF ARTIFACTS\n';
  output += '═══════════════════════════════════\n\n';

  // Define Module
  const auditModule = new ModuleDefinition({
    id: 'AUDIT',
    name: 'AuditManagement',
    displayName: 'Hospital Audit Management',
    description: 'Manages hospital audit processes, findings, and compliance reviews',
    status: 'Operate',
  });
  output += `✓ Module: "${auditModule.displayName}"\n`;

  // Define Entity
  const auditEntity = new EntityDefinition({
    id: 'AUDIT',
    name: 'Audit',
    displayName: 'Audit',
    description: 'Hospital audit record',
    moduleId: 'AUDIT',
  });
  output += `✓ Entity: "${auditEntity.displayName}"\n`;

  // Define Business Functions
  const validateAuditFn = new BusinessFunctionDefinition({
    id: 'AUDIT.VALIDATE.AUDIT.VALIDATE_AUDIT',
    name: 'ValidateAudit',
    displayName: 'Validate Audit',
    description: 'Validate audit record completeness and data quality',
    moduleId: 'AUDIT',
    domain: 'VALIDATE',
    capability: 'AUDIT',
    requestContract: { auditId: 'string', auditData: 'object' },
    responseContract: { valid: 'boolean', issues: 'array' },
  });
  output += `✓ Business Function: "${validateAuditFn.displayName}"\n`;

  const recordFindingFn = new BusinessFunctionDefinition({
    id: 'AUDIT.RECORD.FINDING.RECORD_FINDING',
    name: 'RecordFinding',
    displayName: 'Record Finding',
    description: 'Record audit findings and compliance issues',
    moduleId: 'AUDIT',
    domain: 'RECORD',
    capability: 'FINDING',
    requestContract: { auditId: 'string', finding: 'object' },
    responseContract: { findingId: 'string', recorded: 'boolean' },
  });
  output += `✓ Business Function: "${recordFindingFn.displayName}"\n`;

  const completeAuditFn = new BusinessFunctionDefinition({
    id: 'AUDIT.COMPLETE.AUDIT.COMPLETE_AUDIT',
    name: 'CompleteAudit',
    displayName: 'Complete Audit',
    description: 'Mark audit as complete and generate report',
    moduleId: 'AUDIT',
    domain: 'COMPLETE',
    capability: 'AUDIT',
    requestContract: { auditId: 'string' },
    responseContract: { completed: 'boolean', reportId: 'string' },
  });
  output += `✓ Business Function: "${completeAuditFn.displayName}"\n`;

  // Define Validations
  const dataValidation = new ValidationDefinition({
    id: 'AUDIT_DATA_VALID',
    name: 'AuditDataValidation',
    displayName: 'Audit Data Validation',
    description: 'Validate audit record has required fields',
    moduleId: 'AUDIT',
    scope: 'Audit',
    severity: 'error',
  });
  output += `✓ Validation: "${dataValidation.displayName}"\n`;

  // Define Workflow
  const auditWorkflow = new WorkflowDefinition({
    id: 'audit-review',
    name: 'AuditReview',
    displayName: 'Audit Review',
    description: 'Complete audit review and compliance process',
    moduleId: 'AUDIT',
    steps: [
      new WorkflowStep({
        id: 'validate-step',
        sequence: 0,
        businessFunctionId: 'AUDIT.VALIDATE.AUDIT.VALIDATE_AUDIT',
        displayName: 'Validate Audit',
      }),
      new WorkflowStep({
        id: 'record-step',
        sequence: 1,
        businessFunctionId: 'AUDIT.RECORD.FINDING.RECORD_FINDING',
        displayName: 'Record Finding',
      }),
      new WorkflowStep({
        id: 'complete-step',
        sequence: 2,
        businessFunctionId: 'AUDIT.COMPLETE.AUDIT.COMPLETE_AUDIT',
        displayName: 'Complete Audit',
      }),
    ],
  });
  output += `✓ Workflow: "${auditWorkflow.displayName}" (${auditWorkflow.steps.length} steps)\n`;

  output += '\n';

  // ========== PHASE 2: Register Artifacts ==========
  output += '📚 PHASE 2: REGISTERING IN REGISTRIES\n';
  output += '═════════════════════════════════════\n\n';

  const moduleRegistry = new ModuleRegistry();
  const entityRegistry = new EntityRegistry();
  const functionRegistry = new BusinessFunctionRegistry();
  const validationRegistry = new ValidationRegistry();
  const workflowRegistry = new WorkflowRegistry();

  moduleRegistry.register(auditModule);
  output += `✓ Registered Module (${moduleRegistry.count()} total)\n`;

  entityRegistry.register(auditEntity);
  output += `✓ Registered Entity (${entityRegistry.count()} total)\n`;

  functionRegistry.register(validateAuditFn);
  functionRegistry.register(recordFindingFn);
  functionRegistry.register(completeAuditFn);
  output += `✓ Registered Business Functions (${functionRegistry.count()} total)\n`;

  validationRegistry.register(dataValidation);
  output += `✓ Registered Validation (${validationRegistry.count()} total)\n`;

  workflowRegistry.register(auditWorkflow);
  output += `✓ Registered Workflow (${workflowRegistry.count()} total)\n`;

  output += '\n';

  // ========== PHASE 3: Discover Artifacts ==========
  output += '🔍 PHASE 3: DISCOVERING REGISTERED ARTIFACTS\n';
  output += '═════════════════════════════════════════════\n\n';

  const foundModule = moduleRegistry.findById('AUDIT');
  output += `✓ Found Module: ${foundModule?.displayName}\n`;

  const foundWorkflow = workflowRegistry.findById('audit-review');
  output += `✓ Found Workflow: ${foundWorkflow?.displayName}\n`;

  output += '\n';

  // ========== PHASE 4: Execute Workflow ==========
  output += '⚙️  PHASE 4: EXECUTING WORKFLOW WITH RUNTIME\n';
  output += '════════════════════════════════════════════\n\n';

  const lifecycleManager = new LifecycleManager();
  const workflowEngine = new WorkflowEngine(workflowRegistry, lifecycleManager);

  // Register business function runtimes
  const validateRuntime = new BusinessFunctionRuntime(validateAuditFn);
  validateRuntime.registerHandler(async () => {
    // Simulate validation
    return {
      requestId: 'validate-001',
      status: 'success',
      valid: true,
      issues: [],
    };
  });
  workflowEngine.registerBusinessFunction('AUDIT.VALIDATE.AUDIT.VALIDATE_AUDIT', validateRuntime);

  const recordRuntime = new BusinessFunctionRuntime(recordFindingFn);
  recordRuntime.registerHandler(async () => {
    // Simulate record finding
    return {
      requestId: 'record-001',
      status: 'success',
      findingId: 'FIND-001',
      recorded: true,
    };
  });
  workflowEngine.registerBusinessFunction('AUDIT.RECORD.FINDING.RECORD_FINDING', recordRuntime);

  const completeRuntime = new BusinessFunctionRuntime(completeAuditFn);
  completeRuntime.registerHandler(async () => {
    // Simulate completion
    return {
      requestId: 'complete-001',
      status: 'success',
      completed: true,
      reportId: 'REPORT-001',
    };
  });
  workflowEngine.registerBusinessFunction('AUDIT.COMPLETE.AUDIT.COMPLETE_AUDIT', completeRuntime);

  // Create workflow context with test audit entity
  const testAudit = {
    id: 'AUDIT-2024-001',
    hospital: 'Memorial Hospital',
    department: 'Emergency',
    auditDate: new Date().toISOString(),
  };

  const context = new WorkflowContext({
    workflowId: 'audit-review',
    executionId: 'exec-' + Date.now(),
    correlationId: 'corr-' + Date.now(),
    moduleId: 'AUDIT',
    entity: testAudit,
    inputData: { auditData: testAudit },
    caller: 'audit-user',
  });

  output += `Executing workflow "${auditWorkflow.displayName}"...\n`;
  output += `Entity: Audit ${testAudit.id} at ${testAudit.hospital}\n`;
  output += `Correlation ID: ${context.correlationId}\n\n`;

  // Execute workflow
  const result = await workflowEngine.execute('audit-review', context);

  output += '📊 WORKFLOW EXECUTION RESULT\n';
  output += '════════════════════════════\n\n';

  output += `Status: ${result.status.toUpperCase()}\n`;
  output += `Execution ID: ${result.executionId}\n`;
  output += `Duration: ${result.duration}ms\n`;
  output += `\nSteps:\n`;
  output += `  ✓ Completed: ${result.completedSteps.length}\n`;
  for (const step of result.completedSteps) {
    output += `    - ${step}\n`;
  }
  if (result.failedSteps.length > 0) {
    output += `  ✗ Failed: ${result.failedSteps.length}\n`;
    for (const step of result.failedSteps) {
      output += `    - ${step}\n`;
    }
  }

  output += '\n';

  // ========== PHASE 5: Display Summary ==========
  output += '✨ WBF DEMONSTRATION SUMMARY\n';
  output += '═════════════════════════════\n\n';

  output += '✓ Module: Hospital Audit Management\n';
  output += '✓ Entity: Audit record\n';
  output += '✓ Business Functions: 3 (Validate, Record, Complete)\n';
  output += '✓ Validations: Business rules defined and registered\n';
  output += '✓ Workflow: Multi-step orchestration\n';
  output += '✓ Execution: Successful completion\n';
  output += '✓ Lifecycle: Event dispatch (optional)\n';
  output += '✓ Result: Immutable outcome tracking\n';

  output += '\n';
  output += '📚 WBF CONCEPTS DEMONSTRATED:\n\n';
  output += '1. Business-First Modeling\n';
  output += '   → All artifacts defined in business terms\n\n';

  output += '2. Explicit Business Functions\n';
  output += '   → Named, versioned operations with contracts\n\n';

  output += '3. Business Validation\n';
  output += '   → Business rules defined and available for validation\n\n';

  output += '4. Workflow Orchestration\n';
  output += `   → ${result.completedSteps.length} steps executed in sequence\n\n`;

  output += '5. Lifecycle Management\n';
  output += '   → Events dispatched throughout execution\n\n';

  output += '6. Structured Results\n';
  output += '   → Immutable outcome with complete tracking\n\n';

  output += '7. Registry-Based Discovery\n';
  output += '   → All artifacts discoverable and inspectable\n\n';

  output += '8. Framework-Neutral Architecture\n';
  output += '   → Pure business logic, no HTTP/ORM coupling\n\n';

  output += '╔════════════════════════════════════════════════════════════════╗\n';
  output += '║                  ✓ DEMO COMPLETED SUCCESSFULLY               ║\n';
  output += '╚════════════════════════════════════════════════════════════════╝\n';

  // Prepare JSON output
  const jsonResult = {
    success: result.succeeded(),
    demo: {
      name: 'Hospital Audit Management',
      domain: 'Audit',
    },
    artifacts: {
      module: { id: auditModule.id, displayName: auditModule.displayName },
      entities: [{ id: auditEntity.id, displayName: auditEntity.displayName }],
      businessFunctions: [
        { id: validateAuditFn.id, displayName: validateAuditFn.displayName },
        { id: recordFindingFn.id, displayName: recordFindingFn.displayName },
        { id: completeAuditFn.id, displayName: completeAuditFn.displayName },
      ],
      validations: [{ id: dataValidation.id, displayName: dataValidation.displayName }],
      workflow: { id: auditWorkflow.id, displayName: auditWorkflow.displayName, steps: auditWorkflow.steps.length },
    },
    execution: {
      executionId: result.executionId,
      workflowId: result.workflowId,
      status: result.status,
      completedSteps: result.completedSteps,
      failedSteps: result.failedSteps,
      duration: result.duration,
    },
  };

  return {
    success: result.succeeded(),
    output,
    json: jsonResult,
  };
}
