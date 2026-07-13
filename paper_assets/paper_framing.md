# ForeACT paper framing

## Recommended title

**ForeACT: A Model-Driven Workbench for Actionability Assessment of Forecast Changes**

## Positioning

ForeACT extends the broader model-driven forecasting assurance line:

- ForeSPECT: Are forecasting artifacts semantically valid?
- TRACER: Why did the forecast deviation happen and how can it be traced?
- ForeACT: Should decision-makers act on the forecast change?

## Tool contribution

ForeACT treats forecast change interpretation as a modeling problem. It requires modelers to make the following explicit:

- field semantics,
- forecast versions,
- forecast horizon scope,
- scenario assumptions,
- variance methods,
- volatility methods,
- metamodel extensions,
- conformance rules,
- decision-card traceability.

## Transformation chain

- T1: DatasetVersion -> SemanticFieldModel
- T2: SemanticFieldModel + AnalysisScope -> AlignedForecastModel
- T3: AlignedForecastModel + MethodModel -> SignalModel
- T4: SignalModel + DecisionRules -> DecisionCardModel

## Demo case study

The tool uses an AI data-center electricity-demand forecasting case study. Several forecast cycles estimate the same future monthly demand and peak-load periods. ForeACT allows the modeler to select the forecast cycles and time horizon, then assesses whether the forecast change is actionable, uncertain, or stable.
