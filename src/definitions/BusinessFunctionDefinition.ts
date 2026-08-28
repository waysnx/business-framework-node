/**
 * BusinessFunctionDefinition
 * Immutable definition of a business function artifact
 */
export class BusinessFunctionDefinition {
  readonly id: string;
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly moduleId: string;
  readonly domain: string;
  readonly capability: string;
  readonly version: string;
  readonly lifecycleStatus: string; // Draft, Defined, Approved, Implemented, Released, Deprecated, Retired
  readonly classification: string; // Core, Supporting, Administrative, Reporting, Integration
  readonly visibility: string; // Public, Internal, Private
  readonly businessOwner: string | number;
  readonly technicalOwner: string | number;
  readonly tags: readonly string[];
  readonly dependencies: readonly string[];
  readonly eventsPublished: readonly string[];
  readonly eventsConsumed: readonly string[];
  readonly requestContract: Readonly<Record<string, any>>;
  readonly responseContract: Readonly<Record<string, any>>;
  readonly validationRules: readonly string[];
  readonly authorizationRequirements: Readonly<Record<string, any>>;
  readonly businessRules: readonly string[];
  readonly keywords?: readonly string[];
  readonly errorCategories?: readonly string[];
  readonly observabilityRequirements?: Readonly<Record<string, any>>;
  readonly auditRequirements?: Readonly<Record<string, any>>;
  readonly metadata: Readonly<Record<string, any>>;

  constructor(props: {
    id: string;
    name: string;
    displayName: string;
    description: string;
    moduleId: string;
    domain: string;
    capability: string;
    version?: string;
    lifecycleStatus?: string;
    classification?: string;
    visibility?: string;
    businessOwner?: string | number;
    technicalOwner?: string | number;
    tags?: string[];
    dependencies?: string[];
    eventsPublished?: string[];
    eventsConsumed?: string[];
    requestContract?: Record<string, any>;
    responseContract?: Record<string, any>;
    validationRules?: string[];
    authorizationRequirements?: Record<string, any>;
    businessRules?: string[];
    keywords?: string[];
    errorCategories?: string[];
    observabilityRequirements?: Record<string, any>;
    auditRequirements?: Record<string, any>;
    metadata?: Record<string, any>;
  }) {
    if (!props.id) throw new Error('BusinessFunctionDefinition requires id');
    if (!props.name) throw new Error('BusinessFunctionDefinition requires name');
    if (!props.displayName) throw new Error('BusinessFunctionDefinition requires displayName');
    if (!props.moduleId) throw new Error('BusinessFunctionDefinition requires moduleId');
    if (!props.domain) throw new Error('BusinessFunctionDefinition requires domain');
    if (!props.capability) throw new Error('BusinessFunctionDefinition requires capability');

    this.id = props.id;
    this.name = props.name;
    this.displayName = props.displayName;
    this.description = props.description || '';
    this.moduleId = props.moduleId;
    this.domain = props.domain;
    this.capability = props.capability;
    this.version = props.version || '1.0.0';
    this.lifecycleStatus = props.lifecycleStatus || 'Draft';
    this.classification = props.classification || 'Core';
    this.visibility = props.visibility || 'Public';
    this.businessOwner = props.businessOwner || '';
    this.technicalOwner = props.technicalOwner || '';
    this.tags = Object.freeze([...(props.tags || [])]);
    this.dependencies = Object.freeze([...(props.dependencies || [])]);
    this.eventsPublished = Object.freeze([...(props.eventsPublished || [])]);
    this.eventsConsumed = Object.freeze([...(props.eventsConsumed || [])]);
    this.requestContract = Object.freeze({ ...(props.requestContract || {}) });
    this.responseContract = Object.freeze({ ...(props.responseContract || {}) });
    this.validationRules = Object.freeze([...(props.validationRules || [])]);
    this.authorizationRequirements = Object.freeze({
      ...(props.authorizationRequirements || {}),
    });
    this.businessRules = Object.freeze([...(props.businessRules || [])]);
    this.keywords = props.keywords ? Object.freeze([...props.keywords]) : undefined;
    this.errorCategories = props.errorCategories ? Object.freeze([...props.errorCategories]) : undefined;
    this.observabilityRequirements = props.observabilityRequirements ? Object.freeze({ ...props.observabilityRequirements }) : undefined;
    this.auditRequirements = props.auditRequirements ? Object.freeze({ ...props.auditRequirements }) : undefined;
    this.metadata = Object.freeze({ ...(props.metadata || {}) });

    Object.freeze(this);
  }

  /**
   * Serialize to object
   */
  toObject(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      displayName: this.displayName,
      description: this.description,
      moduleId: this.moduleId,
      domain: this.domain,
      capability: this.capability,
      version: this.version,
      lifecycleStatus: this.lifecycleStatus,
      classification: this.classification,
      visibility: this.visibility,
      businessOwner: this.businessOwner,
      technicalOwner: this.technicalOwner,
      tags: [...this.tags],
      dependencies: [...this.dependencies],
      eventsPublished: [...this.eventsPublished],
      eventsConsumed: [...this.eventsConsumed],
      requestContract: { ...this.requestContract },
      responseContract: { ...this.responseContract },
      validationRules: [...this.validationRules],
      authorizationRequirements: { ...this.authorizationRequirements },
      businessRules: [...this.businessRules],
      keywords: this.keywords ? [...this.keywords] : undefined,
      errorCategories: this.errorCategories ? [...this.errorCategories] : undefined,
      observabilityRequirements: this.observabilityRequirements ? { ...this.observabilityRequirements } : undefined,
      auditRequirements: this.auditRequirements ? { ...this.auditRequirements } : undefined,
      metadata: { ...this.metadata },
    };
  }

  /**
   * Serialize to JSON
   */
  toJson(): string {
    return JSON.stringify(this.toObject());
  }
}
