# ForeACT Studio

**ForeACT** is a model-driven workbench for actionability assessment of forecast changes. It is designed as a MODELS Tools & Demonstrations style prototype, not as a generic dashboard.

The tool organizes the workflow into separate DSL-oriented pages. All pages read from and write to one dataset-specific central project file:

`backend/workspaces/ai_datacenter_capacity.foreact.json`

## Workflow

1. **Semantic Field Modeling**  
   Profile a CSV dataset and enrich automatically discovered fields with role, semantic type, business name, unit, direction, and description. The interface includes search, filters, pagination, role counts, and bulk semantic actions so it can scale to 100+ variables.

2. **Methodology Review**  
   Select baseline/current forecast versions, select the forecast horizon of interest, declare variance and volatility methods, configure thresholds, and review the decision policy.

3. **Metamodel Extension**  
   Inspect the existing ForeACT metamodel and extend it graphically with use-case-specific concepts using a React Flow canvas and tool palette.

4. **Model Transformation Analysis**  
   Compile the project specification into explicit model artifacts:
   - `DatasetVersion -> SemanticFieldModel`
   - `SemanticFieldModel + AnalysisScope -> AlignedForecastModel`
   - `AlignedForecastModel + MethodModel -> SignalModel`
   - `SignalModel + DecisionPolicy -> DecisionCardModel`

5. **Variance and Volatility Analysis**  
   Inspect decision cards, decision policy, variance × volatility matrix, signal details, and conformance checks.

6. **Project Spec File**  
   View or edit the central `.foreact.json` file that connects the whole workbench.

## Run backend

```bash
cd backend
poetry install
poetry run python run.py
```

## Run frontend

```bash
cd frontend
npm install
npm run dev
```

Or from the frontend folder:

```bash
npm run start:all
```

## Active use case

The included use case is **AI data-center electricity demand forecasting**. A utility or planning group compares forecast cycles for the same future months. The tool helps distinguish forecast changes that look actionable from those that should be monitored because uncertainty or volatility is high.

Active dataset:

`data/use_cases/ai_datacenter_load_forecast.csv`

## Why this is model-driven

ForeACT stores the user’s modeling decisions as explicit model elements in the central JSON file. The analysis is generated through transformations over the specification rather than hidden UI state. The compiled result includes both a metamodel view and a model-instance view for introspection.
