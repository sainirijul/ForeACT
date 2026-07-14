export type FieldSpec = {
  name: string;
  role: 'forecast_version' | 'forecast_horizon' | 'scenario' | 'feature' | 'target' | 'previous_forecast' | 'current_forecast' | 'ignore' | string;
  data_type: string;
  semantic_type: string;
  business_name: string;
  unit: string;
  description: string;
  direction: 'higher_is_riskier' | 'lower_is_riskier' | 'neutral' | string;
  include_in_model: boolean;
};

export type AnalysisScope = {
  version_field: string;
  horizon_field: string;
  baseline_version: string;
  current_version: string;
  period_start: string;
  period_end: string;
  grouping_fields: string[];
};

export type MetaAttribute = {
  name: string;
  type: string;
  lowerBound?: number;
  upperBound?: number | '*';
  description?: string;
};

export type MetaReference = {
  name: string;
  target: string;
  lowerBound?: number;
  upperBound?: number | '*';
  containment?: boolean;
  description?: string;
};

export type CustomConcept = {
  name: string;
  kind: 'business_concept' | 'planning_constraint' | 'planning_decision' | 'evidence_source' | 'extension' | string;
  stereotype?: string;
  abstract?: boolean;
  description: string;
  connects_to: string;
  attributes?: MetaAttribute[];
  references?: MetaReference[];
  x?: number;
  y?: number;
};

export type MetaEdge = {
  source: string;
  target: string;
  label: string;
  containment?: boolean;
  kind?: string;
};

export type MethodConfig = {
  variance_method: string;
  volatility_method: string;
  variance_threshold_large: number;
  variance_threshold_moderate: number;
  volatility_threshold_high: number;
  volatility_threshold_medium: number;
  rolling_window: number;
  custom_variance_formula: string;
  custom_volatility_formula: string;
};

export type DecisionPolicy = {
  name: string;
  rules: { id: string; when: string; then: string; rationale: string }[];
};

export type ForeACTProjectSpec = {
  schema_version: string;
  project: {
    id: string;
    name: string;
    tool_name: string;
    domain: string;
    central_file: string;
    description: string;
  };
  dataset: {
    id: string;
    source_type: string;
    path: string;
    format: string;
    version_field: string;
    horizon_field: string;
    description: string;
  };
  dsl_steps: { step: number; name: string; output_model: string }[];
  field_model: { fields: FieldSpec[] };
  methodology_model: { scope: AnalysisScope; methods: MethodConfig; method_notes?: string };
  decision_policy: DecisionPolicy;
  metamodel_extension: { concepts: CustomConcept[]; edges: MetaEdge[] };
  compiled_model?: Record<string, unknown>;
  analysis_cache?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type DatasetProfile = {
  rows: number;
  columns: number;
  column_names: string[];
  numeric_columns: string[];
  forecast_versions: string[];
  period_min: string;
  period_max: string;
  default_scope: AnalysisScope;
  default_field_specs: FieldSpec[];
  field_specs: FieldSpec[];
  selected_methods: MethodConfig;
  selected_scope: AnalysisScope;
  method_catalog: MethodCatalog;
  preview: Record<string, string | number | null>[];
  quality: { name: string; data_type: string; missing_pct: number; distinct_values: number }[];
};

export type ProfileResponse = Omit<DatasetProfile, 'field_specs' | 'selected_methods' | 'selected_scope'>;

export type WorkspaceResponse = {
  spec: ForeACTProjectSpec;
  profile: ProfileResponse;
  workspace_file: string;
  metamodel?: MetaModel;
};

export type MethodCatalog = {
  variance_methods: { id: string; name: string; formula: string; requires: string[]; interpretation: string }[];
  volatility_methods: { id: string; name: string; formula: string; requires: string[]; interpretation: string }[];
};

export type MatrixPoint = {
  target: string;
  x_variance_abs_pct: number;
  y_volatility_score: number;
  variance_class: string;
  volatility_class: string;
  recommended_action: string;
};

export type TargetSeriesPoint = {
  period: string;
  baseline: number | null;
  current: number | null;
  variance_pct: number | null;
  volatility: number | null;
};

export type TargetResult = {
  target: string;
  variance_basis: string;
  volatility_basis: string;
  mean_abs_variance_pct: number;
  latest_variance_pct: number;
  volatility_score: number;
  variance_class: string;
  volatility_class: string;
  confidence: string;
  recommended_action: string;
  rationale: string;
  top_driver_links: { feature: string; correlation: number | null; absolute_strength: number | null }[];
  series: TargetSeriesPoint[];
};

export type DecisionCard = {
  target: string;
  headline: string;
  trace: Record<string, string>;
  rationale: string;
};

export type ConformanceResult = {
  rule_id: string;
  status: string;
  severity: string;
  message: string;
};

export type ModelFitSummary = {
  target: string;
  model: string;
  features_used?: string[];
  train_rows?: number;
  test_rows?: number;
  mae: number | string;
  rmse: number | string;
  r2: number | string;
};

export type Transformation = {
  id: string;
  name: string;
  input: string;
  output: string;
  purpose: string;
  status: string;
};

export type MetaModelNode = {
  id: string;
  label: string;
  kind: string;
  package?: string;
  stereotype?: string;
  abstract?: boolean;
  count?: number;
  attributes?: MetaAttribute[];
  references?: MetaReference[];
  position?: { x: number; y: number };
  isCore?: boolean;
};

export type MetaModelGraph = {
  nodes: MetaModelNode[];
  edges: { source: string; target: string; label: string; kind?: string }[];
};

export type MetaModel = {
  name: string;
  version: string;
  intent: string;
  source?: string;
  nsURI?: string;
  classes?: MetaModelNode[];
  enums?: { name: string; literals: string[] }[];
  graph: MetaModelGraph;
  concepts?: Record<string, unknown>;
  conformance_rules?: unknown[];
  runtime_summary?: Record<string, unknown>;
};

export type AnalysisResponse = {
  dataset_profile: DatasetProfile;
  metamodel: MetaModel;
  transformations: Transformation[];
  model_fit_summary: ModelFitSummary[];
  target_results: TargetResult[];
  matrix_points: MatrixPoint[];
  decision_cards: DecisionCard[];
  conformance_results: ConformanceResult[];
  forecast_comparison_preview: Record<string, unknown>[];
  aligned_forecast_preview?: Record<string, unknown>[];
  project_spec?: ForeACTProjectSpec;
  workspace_file?: string;
  warnings?: string[];
};
