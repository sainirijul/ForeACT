# ForeACT Studio

ForeACT Studio is a model-driven forecast actionability workbench for the AI data-center electricity-demand forecasting use case.

## What is new in this version

This version uses **one canonical metamodel file**:

```text
backend/metamodel/foreact.ecore
```

The backend loads this Ecore file with PyEcore and projects it into JSON for the frontend. The React UI no longer maintains a separate hard-coded TypeScript metamodel. Project-specific extensions are saved in the dataset/use-case-specific ForeACT project file:

```text
backend/workspaces/ai_datacenter_capacity.foreact.json
```

## Main pages

1. Semantic Field Modeling — DSL Step 1
2. Methodology Review — DSL Steps 2–3
3. Metamodel Extension — DSL Step 4
4. Model Rigor & Instance View
5. Variance & Volatility Analysis
6. Project Spec File

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

or:

```bash
cd frontend
npm run start:all
```

## Single-source metamodel flow

```text
backend/metamodel/foreact.ecore
  → PyEcore loader
  → /api/metamodel
  → React Flow metamodel view
  → compiled model instance / analysis views
```

The metamodel uses inheritance, composition, and associations. Composition is shown with `◆`, inheritance with `extends`, and regular references as labeled associations.


## v6.3 fix notes

- The ForeACT metamodel is maintained in one file: `backend/metamodel/foreact.ecore`.
- No manual generation button is required. The backend projects the Ecore metamodel through `GET /api/metamodel`.
- The Metamodel Extension page now renders directly from `metamodel.graph.nodes` / `metamodel.graph.edges`.
- The frontend TypeScript build errors from `replaceAll` and unknown model-fit rows are fixed.
- Extension classes can be added, selected, inspected, and deleted.
