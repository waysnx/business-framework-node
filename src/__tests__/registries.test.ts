import {
  EntityRegistry,
  ModuleRegistry,
  BusinessFunctionRegistry,
  ValidationRegistry,
  WorkflowRegistry,
} from '../registries';
import {
  EntityDefinition,
  ModuleDefinition,
  BusinessFunctionDefinition,
  ValidationDefinition,
  WorkflowDefinition,
} from '../definitions';
import { DuplicateError, NotFoundError } from '../errors';

describe('Registry Operations', () => {
  describe('EntityRegistry - Universal Pattern', () => {
    let reg: EntityRegistry;

    beforeEach(() => {
      reg = new EntityRegistry();
    });

    it('registers and finds', () => {
      const def = new EntityDefinition({
        id: 'e1',
        name: 'Entity',
        displayName: 'Entity',
        description: 'Entity',
        moduleId: 'M1',
      });
      reg.register(def);
      expect(reg.findById('e1').name).toBe('Entity');
      expect(reg.findByName('Entity').id).toBe('e1');
    });

    it('prevents duplicate ID', () => {
      const def1 = new EntityDefinition({
        id: 'e1',
        name: 'E1',
        displayName: 'E1',
        description: 'E1',
        moduleId: 'M1',
      });
      const def2 = new EntityDefinition({
        id: 'e1',
        name: 'E2',
        displayName: 'E2',
        description: 'E2',
        moduleId: 'M1',
      });
      reg.register(def1);
      expect(() => reg.register(def2)).toThrow(DuplicateError);
    });

    it('unregisters', () => {
      const def = new EntityDefinition({
        id: 'e1',
        name: 'Entity',
        displayName: 'Entity',
        description: 'Entity',
        moduleId: 'M1',
      });
      reg.register(def);
      reg.unregister('e1');
      expect(() => reg.findById('e1')).toThrow(NotFoundError);
    });

    it('handles aliases', () => {
      const def = new EntityDefinition({
        id: 'e1',
        name: 'Entity',
        displayName: 'Entity',
        description: 'Entity',
        moduleId: 'M1',
      });
      reg.register(def);
      reg.alias('e1', 'alias1');
      expect(reg.findByAlias('alias1').id).toBe('e1');
      expect(reg.getAliasesFor('e1')).toContain('alias1');
    });

    it('tracks count', () => {
      expect(reg.count()).toBe(0);
      const def = new EntityDefinition({
        id: 'e1',
        name: 'Entity',
        displayName: 'Entity',
        description: 'Entity',
        moduleId: 'M1',
      });
      reg.register(def);
      expect(reg.count()).toBe(1);
      expect(reg.exists('e1')).toBe(true);
    });

    it('returns all', () => {
      const def = new EntityDefinition({
        id: 'e1',
        name: 'Entity',
        displayName: 'Entity',
        description: 'Entity',
        moduleId: 'M1',
      });
      reg.register(def);
      const all = reg.all();
      expect(all.size).toBe(1);
      expect(all.has('e1')).toBe(true);
    });

    it('finds by tag', () => {
      const def = new EntityDefinition({
        id: 'e1',
        name: 'Entity',
        displayName: 'Entity',
        description: 'Entity',
        moduleId: 'M1',
        tags: ['important'],
      });
      reg.register(def);
      const tagged = reg.findByTag('important');
      expect(tagged.length).toBe(1);
    });
  });

  describe('BusinessFunctionRegistry - Specialized Queries', () => {
    let reg: BusinessFunctionRegistry;

    beforeEach(() => {
      reg = new BusinessFunctionRegistry();
    });

    it('finds by module', () => {
      const def = new BusinessFunctionDefinition({
        id: 'fn1',
        name: 'fn1',
        displayName: 'Function 1',
        description: 'Function 1',
        moduleId: 'HR',
        domain: 'DOM',
        capability: 'CAP',
      });
      reg.register(def);
      const fns = reg.findByModule('HR');
      expect(fns.length).toBe(1);
    });

    it('finds by category', () => {
      const def = new BusinessFunctionDefinition({
        id: 'fn1',
        name: 'fn1',
        displayName: 'Function 1',
        description: 'Function 1',
        moduleId: 'MOD',
        domain: 'DOM',
        capability: 'CAP',
        classification: 'Core',
      });
      reg.register(def);
      const core = reg.findByCategory('Core');
      expect(core.length).toBe(1);
    });
  });

  describe('ValidationRegistry - Scope & Severity', () => {
    let reg: ValidationRegistry;

    beforeEach(() => {
      reg = new ValidationRegistry();
    });

    it('finds by scope', () => {
      const def = new ValidationDefinition({
        id: 'v1',
        name: 'val',
        displayName: 'Validation',
        description: 'Validation',
        moduleId: 'MOD',
        scope: 'Employee',
        enabled: true,
      });
      reg.register(def);
      const vals = reg.findByScope('Employee');
      expect(vals.length).toBe(1);
    });

    it('finds by severity', () => {
      const def = new ValidationDefinition({
        id: 'v1',
        name: 'val',
        displayName: 'Validation',
        description: 'Validation',
        moduleId: 'MOD',
        scope: 'Entity',
        severity: 'error',
        enabled: true,
      });
      reg.register(def);
      const errors = reg.findBySeverity('error');
      expect(errors.length).toBe(1);
    });
  });

  describe('WorkflowRegistry - Module & Trigger', () => {
    let reg: WorkflowRegistry;

    beforeEach(() => {
      reg = new WorkflowRegistry();
    });

    it('finds by module', () => {
      const def = new WorkflowDefinition({
        id: 'wf1',
        name: 'wf1',
        displayName: 'Workflow',
        description: 'Workflow',
        moduleId: 'HR',
        enabled: true,
      });
      reg.register(def);
      const wfs = reg.findByModule('HR');
      expect(wfs.length).toBe(1);
    });

    it('finds by trigger', () => {
      const def = new WorkflowDefinition({
        id: 'wf1',
        name: 'wf1',
        displayName: 'Workflow',
        description: 'Workflow',
        moduleId: 'MOD',
        triggerType: 'manual',
        enabled: true,
      });
      reg.register(def);
      const manual = reg.findByTrigger('manual');
      expect(manual.length).toBe(1);
    });

    it('finds by entity type', () => {
      const def = new WorkflowDefinition({
        id: 'wf1',
        name: 'wf1',
        displayName: 'Workflow',
        description: 'Workflow',
        moduleId: 'MOD',
        supportedEntityTypes: ['Employee'],
        enabled: true,
      });
      reg.register(def);
      const wfs = reg.findByEntity('Employee');
      expect(wfs.length).toBe(1);
    });
  });

  describe('ModuleRegistry - Active & Dependencies', () => {
    let reg: ModuleRegistry;

    beforeEach(() => {
      reg = new ModuleRegistry();
    });

    it('finds active modules', () => {
      const active = new ModuleDefinition({
        id: 'm1',
        name: 'Module1',
        displayName: 'Module 1',
        description: 'Module 1',
        status: 'Operate',
      });
      const inactive = new ModuleDefinition({
        id: 'm2',
        name: 'Module2',
        displayName: 'Module 2',
        description: 'Module 2',
        status: 'Draft',
      });
      reg.register(active);
      reg.register(inactive);
      const actives = reg.active();
      expect(actives.length).toBe(1);
      expect(actives[0].id).toBe('m1');
    });

    it('finds by domain', () => {
      const def = new ModuleDefinition({
        id: 'm1',
        name: 'Module1',
        displayName: 'Module 1',
        description: 'Module 1',
        domains: ['d1', 'd2'],
      });
      reg.register(def);
      const mods = reg.findByDomain('d1');
      expect(mods.length).toBe(1);
    });
  });
});
