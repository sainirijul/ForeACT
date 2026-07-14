import type { Edge, Node } from '@xyflow/react';
import type { CustomConcept, MetaAttribute, MetaEdge, MetaReference } from '../types/analysis';

export type MetaclassDefinition = {
  id: string;
  label: string;
  packageName: string;
  stereotype: 'EClass' | 'Abstract EClass' | 'EEnum' | 'EDataType';
  abstract?: boolean;
  description: string;
  attributes: MetaAttribute[];
  references: MetaReference[];
};

export type PaletteTemplate = {
  id: string;
  label: string;
  kind: CustomConcept['kind'];
  description: string;
  defaultName: string;
  attributes: MetaAttribute[];
  references: MetaReference[];
  defaultEdges: MetaEdge[];
};


export const CORE_METACLASSES: MetaclassDefinition[] = [
  {
    id: 'ModelElement',
    label: 'ModelElement',
    packageName: 'Core',
    stereotype: 'Abstract EClass',
    abstract: true,
    description: 'Common abstract superclass for named ForeACT model elements.',
    attributes: [
      { name: 'id', type: 'EString' },
      { name: 'name', type: 'EString' },
      { name: 'description', type: 'EString' },
    ],
    references: [],
  },
  {
    id: 'ForecastAssuranceProject',
    label: 'ForecastAssuranceProject',
    packageName: 'Project',
    stereotype: 'EClass',
    description: 'Root container for one dataset-specific ForeACT assurance project.',
    attributes: [
      { name: 'domain', type: 'EString' },
      { name: 'createdAt', type: 'EDate' },
    ],
    references: [
      { name: 'dataset', target: 'DatasetVersion', lowerBound: 1, upperBound: 1, containment: true },
      { name: 'fieldModel', target: 'FieldModel', lowerBound: 1, upperBound: 1, containment: true },
      { name: 'scenarioModel', target: 'ScenarioModel', lowerBound: 0, upperBound: 1, containment: true },
      { name: 'methodSet', target: 'MethodSet', lowerBound: 1, upperBound: 1, containment: true },
      { name: 'comparisonModel', target: 'ForecastComparisonModel', lowerBound: 0, upperBound: 1, containment: true },
      { name: 'signalModel', target: 'SignalModel', lowerBound: 0, upperBound: 1, containment: true },
      { name: 'decisionModel', target: 'DecisionModel', lowerBound: 0, upperBound: 1, containment: true },
    ],
  },
  {
    id: 'DatasetVersion',
    label: 'DatasetVersion',
    packageName: 'Data',
    stereotype: 'EClass',
    description: 'Versioned dataset used for forecast change assurance.',
    attributes: [
      { name: 'sourcePath', type: 'EString' },
      { name: 'rowCount', type: 'EInt' },
      { name: 'columnCount', type: 'EInt' },
    ],
    references: [
      { name: 'rawFields', target: 'RawField', lowerBound: 1, upperBound: '*', containment: true },
    ],
  },
  {
    id: 'RawField',
    label: 'RawField',
    packageName: 'Data',
    stereotype: 'EClass',
    description: 'Field discovered directly from the uploaded dataset.',
    attributes: [
      { name: 'columnName', type: 'EString' },
      { name: 'dataType', type: 'EString' },
      { name: 'missingRate', type: 'EDouble' },
    ],
    references: [],
  },
  {
    id: 'FieldModel',
    label: 'FieldModel',
    packageName: 'Semantics',
    stereotype: 'EClass',
    description: 'Container for semantic field specifications.',
    attributes: [
      { name: 'completenessScore', type: 'EDouble' },
    ],
    references: [
      { name: 'fields', target: 'SemanticField', lowerBound: 1, upperBound: '*', containment: true },
    ],
  },
  {
    id: 'SemanticField',
    label: 'SemanticField',
    packageName: 'Semantics',
    stereotype: 'Abstract EClass',
    abstract: true,
    description: 'Abstract semantic interpretation of a raw dataset field.',
    attributes: [
      { name: 'businessName', type: 'EString' },
      { name: 'unit', type: 'EString' },
      { name: 'semanticType', type: 'EString' },
      { name: 'direction', type: 'DirectionKind' },
    ],
    references: [
      { name: 'sourceColumn', target: 'RawField', lowerBound: 1, upperBound: 1 },
    ],
  },
  {
    id: 'VersionField',
    label: 'VersionField',
    packageName: 'Semantics',
    stereotype: 'EClass',
    description: 'Semantic field identifying forecast cycles or forecast versions.',
    attributes: [
      { name: 'versionFormat', type: 'EString' },
    ],
    references: [],
  },
  {
    id: 'HorizonField',
    label: 'HorizonField',
    packageName: 'Semantics',
    stereotype: 'EClass',
    description: 'Semantic field identifying forecast periods or forecast horizons.',
    attributes: [
      { name: 'granularity', type: 'EString' },
    ],
    references: [],
  },
  {
    id: 'TargetField',
    label: 'TargetField',
    packageName: 'Semantics',
    stereotype: 'EClass',
    description: 'Semantic field representing a forecast target.',
    attributes: [
      { name: 'riskDirection', type: 'DirectionKind' },
    ],
    references: [],
  },
  {
    id: 'DriverField',
    label: 'DriverField',
    packageName: 'Semantics',
    stereotype: 'EClass',
    description: 'Semantic field representing a driver or explanatory variable.',
    attributes: [
      { name: 'expectedEffect', type: 'DirectionKind' },
    ],
    references: [],
  },
  {
    id: 'ScenarioModel',
    label: 'ScenarioModel',
    packageName: 'Scenario',
    stereotype: 'EClass',
    description: 'Container for assumptions and evidence that contextualize forecast changes.',
    attributes: [],
    references: [
      { name: 'assumptions', target: 'AssumptionElement', lowerBound: 0, upperBound: '*', containment: true },
      { name: 'evidence', target: 'EvidenceArtifact', lowerBound: 0, upperBound: '*', containment: true },
    ],
  },
  {
    id: 'AssumptionElement',
    label: 'AssumptionElement',
    packageName: 'Scenario',
    stereotype: 'Abstract EClass',
    abstract: true,
    description: 'Abstract superclass for scenario assumptions and domain-specific assumptions.',
    attributes: [
      { name: 'confidence', type: 'ConfidenceKind' },
      { name: 'validityPeriod', type: 'EString' },
    ],
    references: [
      { name: 'supportedBy', target: 'EvidenceArtifact', lowerBound: 0, upperBound: '*', containment: false },
    ],
  },
  {
    id: 'ScenarioAssumption',
    label: 'ScenarioAssumption',
    packageName: 'Scenario',
    stereotype: 'EClass',
    description: 'General assumption used to contextualize a forecast change.',
    attributes: [
      { name: 'statement', type: 'EString' },
    ],
    references: [],
  },
  {
    id: 'DataCenterCommitment',
    label: 'DataCenterCommitment',
    packageName: 'Scenario',
    stereotype: 'EClass',
    description: 'Use-case-specific assumption representing planned or committed AI data-center load.',
    attributes: [
      { name: 'committedLoadMW', type: 'EDouble' },
      { name: 'probability', type: 'EDouble' },
      { name: 'expectedInServiceDate', type: 'EString' },
    ],
    references: [
      { name: 'affects', target: 'TargetField', lowerBound: 0, upperBound: '*', containment: false },
    ],
  },
  {
    id: 'EvidenceArtifact',
    label: 'EvidenceArtifact',
    packageName: 'Scenario',
    stereotype: 'EClass',
    description: 'Evidence used to support assumptions, confidence signals, or decision recommendations.',
    attributes: [
      { name: 'sourceType', type: 'EString' },
      { name: 'uri', type: 'EString' },
      { name: 'confidence', type: 'ConfidenceKind' },
    ],
    references: [],
  },
  {
    id: 'MethodSet',
    label: 'MethodSet',
    packageName: 'Methodology',
    stereotype: 'EClass',
    description: 'Container for selected analysis methods.',
    attributes: [],
    references: [
      { name: 'methods', target: 'AnalysisMethod', lowerBound: 1, upperBound: '*', containment: true },
    ],
  },
  {
    id: 'AnalysisMethod',
    label: 'AnalysisMethod',
    packageName: 'Methodology',
    stereotype: 'Abstract EClass',
    abstract: true,
    description: 'Abstract superclass for declared analysis methods.',
    attributes: [
      { name: 'formula', type: 'EString' },
      { name: 'threshold', type: 'EDouble' },
    ],
    references: [],
  },
  {
    id: 'VarianceMethod',
    label: 'VarianceMethod',
    packageName: 'Methodology',
    stereotype: 'EClass',
    description: 'Method used to compute forecast variance.',
    attributes: [
      { name: 'largeVarianceThreshold', type: 'EDouble' },
    ],
    references: [],
  },
  {
    id: 'VolatilityMethod',
    label: 'VolatilityMethod',
    packageName: 'Methodology',
    stereotype: 'EClass',
    description: 'Method used to compute forecast volatility.',
    attributes: [
      { name: 'highVolatilityThreshold', type: 'EDouble' },
    ],
    references: [],
  },
  {
    id: 'ConfidenceMethod',
    label: 'ConfidenceMethod',
    packageName: 'Methodology',
    stereotype: 'EClass',
    description: 'Method used to classify confidence.',
    attributes: [
      { name: 'confidenceRule', type: 'EString' },
    ],
    references: [],
  },
  {
    id: 'ForecastComparisonModel',
    label: 'ForecastComparisonModel',
    packageName: 'Comparison',
    stereotype: 'EClass',
    description: 'Derived model comparing baseline and current forecasts over the same selected horizon.',
    attributes: [
      { name: 'baselineVersion', type: 'EString' },
      { name: 'currentVersion', type: 'EString' },
      { name: 'periodStart', type: 'EString' },
      { name: 'periodEnd', type: 'EString' },
    ],
    references: [
      { name: 'records', target: 'ForecastComparisonRecord', lowerBound: 1, upperBound: '*', containment: true },
      { name: 'versionField', target: 'VersionField', lowerBound: 1, upperBound: 1 },
      { name: 'horizonField', target: 'HorizonField', lowerBound: 1, upperBound: 1 },
    ],
  },
  {
    id: 'ForecastComparisonRecord',
    label: 'ForecastComparisonRecord',
    packageName: 'Comparison',
    stereotype: 'EClass',
    description: 'Paired baseline and current forecast value for one target and period.',
    attributes: [
      { name: 'period', type: 'EString' },
      { name: 'baselineValue', type: 'EDouble' },
      { name: 'currentValue', type: 'EDouble' },
      { name: 'delta', type: 'EDouble' },
    ],
    references: [
      { name: 'target', target: 'TargetField', lowerBound: 1, upperBound: 1 },
    ],
  },
  {
    id: 'SignalModel',
    label: 'SignalModel',
    packageName: 'Signals',
    stereotype: 'EClass',
    description: 'Container for variance, volatility, and confidence signals.',
    attributes: [],
    references: [
      { name: 'signals', target: 'Signal', lowerBound: 1, upperBound: '*', containment: true },
    ],
  },
  {
    id: 'Signal',
    label: 'Signal',
    packageName: 'Signals',
    stereotype: 'Abstract EClass',
    abstract: true,
    description: 'Abstract superclass for computed forecast assurance signals.',
    attributes: [
      { name: 'value', type: 'EDouble' },
      { name: 'classification', type: 'SignalClass' },
    ],
    references: [
      { name: 'computedFor', target: 'TargetField', lowerBound: 1, upperBound: 1 },
      { name: 'computedBy', target: 'AnalysisMethod', lowerBound: 1, upperBound: 1 },
    ],
  },
  {
    id: 'VarianceSignal',
    label: 'VarianceSignal',
    packageName: 'Signals',
    stereotype: 'EClass',
    description: 'Signal representing the magnitude of forecast change.',
    attributes: [
      { name: 'variancePct', type: 'EDouble' },
    ],
    references: [],
  },
  {
    id: 'VolatilitySignal',
    label: 'VolatilitySignal',
    packageName: 'Signals',
    stereotype: 'EClass',
    description: 'Signal representing instability across forecast revisions or drivers.',
    attributes: [
      { name: 'volatilityScore', type: 'EDouble' },
    ],
    references: [],
  },
  {
    id: 'ConfidenceSignal',
    label: 'ConfidenceSignal',
    packageName: 'Signals',
    stereotype: 'EClass',
    description: 'Signal representing confidence in the forecast change interpretation.',
    attributes: [
      { name: 'confidenceLevel', type: 'ConfidenceKind' },
    ],
    references: [
      { name: 'supportedBy', target: 'EvidenceArtifact', lowerBound: 0, upperBound: '*', containment: false },
    ],
  },
  {
    id: 'DecisionModel',
    label: 'DecisionModel',
    packageName: 'Decision',
    stereotype: 'EClass',
    description: 'Container for policies, rules, and decision cards.',
    attributes: [],
    references: [
      { name: 'policy', target: 'DecisionPolicy', lowerBound: 1, upperBound: 1, containment: true },
      { name: 'cards', target: 'DecisionCard', lowerBound: 0, upperBound: '*', containment: true },
    ],
  },
  {
    id: 'DecisionPolicy',
    label: 'DecisionPolicy',
    packageName: 'Decision',
    stereotype: 'EClass',
    description: 'Policy mapping signal patterns to actionability recommendations.',
    attributes: [
      { name: 'name', type: 'EString' },
    ],
    references: [
      { name: 'rules', target: 'DecisionRule', lowerBound: 1, upperBound: '*', containment: true },
    ],
  },
  {
    id: 'DecisionRule',
    label: 'DecisionRule',
    packageName: 'Decision',
    stereotype: 'EClass',
    description: 'Rule that maps variance, volatility, and confidence patterns to an action.',
    attributes: [
      { name: 'condition', type: 'EString' },
      { name: 'action', type: 'ActionKind' },
    ],
    references: [],
  },
  {
    id: 'DecisionCard',
    label: 'DecisionCard',
    packageName: 'Decision',
    stereotype: 'EClass',
    description: 'Decision-facing interpretation of forecast change for one target.',
    attributes: [
      { name: 'headline', type: 'EString' },
      { name: 'recommendedAction', type: 'ActionKind' },
      { name: 'rationale', type: 'EString' },
    ],
    references: [
      { name: 'target', target: 'TargetField', lowerBound: 1, upperBound: 1 },
      { name: 'usesSignals', target: 'Signal', lowerBound: 1, upperBound: '*', containment: false },
      { name: 'appliesPolicy', target: 'DecisionPolicy', lowerBound: 1, upperBound: 1 },
      { name: 'supportedBy', target: 'EvidenceArtifact', lowerBound: 0, upperBound: '*', containment: false },
    ],
  },
];


export const INHERITANCE_EDGES: MetaEdge[] = [
  { source: 'ForecastAssuranceProject', target: 'ModelElement', label: 'extends' },
  { source: 'DatasetVersion', target: 'ModelElement', label: 'extends' },
  { source: 'FieldModel', target: 'ModelElement', label: 'extends' },
  { source: 'ScenarioModel', target: 'ModelElement', label: 'extends' },
  { source: 'MethodSet', target: 'ModelElement', label: 'extends' },
  { source: 'ForecastComparisonModel', target: 'ModelElement', label: 'extends' },
  { source: 'SignalModel', target: 'ModelElement', label: 'extends' },
  { source: 'DecisionModel', target: 'ModelElement', label: 'extends' },

  { source: 'VersionField', target: 'SemanticField', label: 'extends' },
  { source: 'HorizonField', target: 'SemanticField', label: 'extends' },
  { source: 'TargetField', target: 'SemanticField', label: 'extends' },
  { source: 'DriverField', target: 'SemanticField', label: 'extends' },

  { source: 'ScenarioAssumption', target: 'AssumptionElement', label: 'extends' },
  { source: 'DataCenterCommitment', target: 'AssumptionElement', label: 'extends' },

  { source: 'VarianceMethod', target: 'AnalysisMethod', label: 'extends' },
  { source: 'VolatilityMethod', target: 'AnalysisMethod', label: 'extends' },
  { source: 'ConfidenceMethod', target: 'AnalysisMethod', label: 'extends' },

  { source: 'VarianceSignal', target: 'Signal', label: 'extends' },
  { source: 'VolatilitySignal', target: 'Signal', label: 'extends' },
  { source: 'ConfidenceSignal', target: 'Signal', label: 'extends' },
];

export const COMPOSITION_AND_ASSOCIATION_EDGES: MetaEdge[] = CORE_METACLASSES.flatMap((meta) =>
  meta.references.map((ref) => ({
    source: meta.id,
    target: ref.target,
    label: ref.containment ? `◆ ${ref.name}` : ref.name,
    containment: ref.containment,
  })),
);

export const CORE_EDGES: MetaEdge[] = [
  ...INHERITANCE_EDGES,
  ...COMPOSITION_AND_ASSOCIATION_EDGES,
];

export const PALETTE_TEMPLATES: PaletteTemplate[] = [
  {
    id: 'business_concept',
    label: 'Business Concept',
    kind: 'business_concept',
    defaultName: 'DomainConcept',
    description: 'A use-case-specific business entity, such as customer segment, facility, route, or load source.',
    attributes: [
      { name: 'name', type: 'EString' },
      { name: 'description', type: 'EString' },
    ],
    references: [
      { name: 'refines', target: 'ScenarioAssumption', lowerBound: 0, upperBound: '*' },
    ],
    defaultEdges: [
      { source: '__SELF__', target: 'ScenarioAssumption', label: 'refines' },
    ],
  },
  {
    id: 'planning_constraint',
    label: 'Planning Constraint',
    kind: 'planning_constraint',
    defaultName: 'PlanningConstraint',
    description: 'A constraint that may limit or condition a forecast-based decision.',
    attributes: [
      { name: 'name', type: 'EString' },
      { name: 'severity', type: 'EString' },
      { name: 'description', type: 'EString' },
    ],
    references: [
      { name: 'constrains', target: 'DecisionPolicy', lowerBound: 0, upperBound: '*' },
    ],
    defaultEdges: [
      { source: '__SELF__', target: 'DecisionPolicy', label: 'constrains' },
    ],
  },
  {
    id: 'planning_decision',
    label: 'Planning Decision',
    kind: 'planning_decision',
    defaultName: 'PlanningDecision',
    description: 'A domain-specific decision that is informed by a ForeACT decision card.',
    attributes: [
      { name: 'name', type: 'EString' },
      { name: 'owner', type: 'EString' },
      { name: 'decisionWindow', type: 'EString' },
    ],
    references: [
      { name: 'informedBy', target: 'DecisionCard', lowerBound: 0, upperBound: '*' },
    ],
    defaultEdges: [
      { source: '__SELF__', target: 'DecisionCard', label: 'informedBy' },
    ],
  },
  {
    id: 'evidence_source',
    label: 'Evidence Source',
    kind: 'evidence_source',
    defaultName: 'ExternalEvidence',
    description: 'A domain-specific evidence artifact that supports assumptions, confidence, or recommendations.',
    attributes: [
      { name: 'title', type: 'EString' },
      { name: 'sourceType', type: 'EString' },
      { name: 'confidence', type: 'ConfidenceKind' },
    ],
    references: [
      { name: 'specializes', target: 'EvidenceArtifact', lowerBound: 1, upperBound: 1 },
    ],
    defaultEdges: [
      { source: '__SELF__', target: 'EvidenceArtifact', label: 'specializes' },
    ],
  },
  {
    id: 'datacenter_commitment',
    label: 'AI Data-Center Commitment',
    kind: 'business_concept',
    defaultName: 'DataCenterCommitment',
    description: 'A planned or committed data-center load that affects electricity demand forecasts.',
    attributes: [
      { name: 'projectName', type: 'EString' },
      { name: 'committedLoadMW', type: 'EDouble' },
      { name: 'probability', type: 'EDouble' },
      { name: 'expectedInServiceDate', type: 'EString' },
    ],
    references: [
      { name: 'refines', target: 'ScenarioAssumption', lowerBound: 0, upperBound: '*' },
      { name: 'supportedBy', target: 'EvidenceArtifact', lowerBound: 0, upperBound: '*' },
      { name: 'affects', target: 'ForecastTarget', lowerBound: 0, upperBound: '*' },
    ],
    defaultEdges: [
      { source: '__SELF__', target: 'ScenarioAssumption', label: 'refines' },
      { source: '__SELF__', target: 'EvidenceArtifact', label: 'supportedBy' },
      { source: '__SELF__', target: 'ForecastTarget', label: 'affects' },
    ],
  },
];

export function conceptId(name: string): string {
  return name.replace(/\s+/g, '').replace(/[^a-zA-Z0-9_]/g, '');
}

export function classToNode(meta: MetaclassDefinition, index: number): Node {
  return {
    id: meta.id,
    type: 'umlClass',
    position: {
      x: (index % 4) * 340,
      y: Math.floor(index / 4) * 230,
    },
    data: {
      label: meta.label,
      packageName: meta.packageName,
      stereotype: meta.stereotype,
      abstract: meta.abstract ?? false,
      description: meta.description,
      attributes: meta.attributes.map((a) => `${a.name}: ${a.type}`),
      references: meta.references.map(
        (r) => `${r.name}: ${r.target} [${r.lowerBound ?? 0}..${r.upperBound ?? '*'}]`,
      ),
      isCore: true,
      rawAttributes: meta.attributes,
      rawReferences: meta.references,
    },
  };
}

export function conceptToNode(concept: CustomConcept, index: number): Node {
  const id = conceptId(concept.name || `ExtensionConcept${index + 1}`);

  return {
    id,
    type: 'umlClass',
    position: {
      x: concept.x ?? 180 + (index % 4) * 340,
      y: concept.y ?? 1450 + Math.floor(index / 4) * 230,
    },
    data: {
      label: concept.name || id,
      packageName: 'Use-case Extension',
      stereotype: concept.stereotype || 'EClass',
      abstract: Boolean(concept.abstract),
      description: concept.description || '',
      kind: concept.kind,
      attributes: (concept.attributes || []).map((a) => `${a.name}: ${a.type}`),
      references: (concept.references || []).map(
        (r) => `${r.name}: ${r.target} [${r.lowerBound ?? 0}..${r.upperBound ?? '*'}]`,
      ),
      isCore: false,
      rawAttributes: concept.attributes || [],
      rawReferences: concept.references || [],
    },
  };
}

export function edgeToFlow(edge: MetaEdge, index: number): Edge {
  const isInheritance = edge.label === 'extends';
  const isComposition = edge.label.startsWith('◆') || edge.containment;

  return {
    id: `edge-${index}-${edge.source}-${edge.target}-${edge.label}`,
    source: conceptId(edge.source),
    target: conceptId(edge.target),
    label: edge.label,
    type: isInheritance ? 'straight' : 'smoothstep',
    animated: false,
    style: {
      strokeWidth: isInheritance ? 1.5 : isComposition ? 2.2 : 1.4,
      strokeDasharray: isInheritance ? '6 4' : undefined,
    },
  };
}

export function buildMetamodelFlow(concepts: CustomConcept[], extensionEdges: MetaEdge[]) {
  const coreNodes = CORE_METACLASSES.map(classToNode);
  const customNodes = concepts.map(conceptToNode);

  const coreEdges = CORE_EDGES.map(edgeToFlow);
  const customEdges = extensionEdges.map((edge, idx) => edgeToFlow(edge, idx + CORE_EDGES.length));

  return {
    nodes: [...coreNodes, ...customNodes],
    edges: [...coreEdges, ...customEdges],
  };
}