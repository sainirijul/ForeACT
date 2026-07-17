from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass
class FieldSpec:
    name: str
    role: str
    data_type: str = "numeric"
    semantic_type: str = "unknown"
    business_name: str = ""
    unit: str = ""
    description: str = ""
    direction: str = "higher_is_riskier"
    include_in_model: bool = True


@dataclass
class MethodSpec:
    revision_method: str = "version_to_version_pct"
    volatility_method: str = "version_dispersion_pct"
    revision_magnitude_threshold_large: float = 5.0
    volatility_threshold_high: float = 4.0
    rolling_window: int = 4
    custom_revision_formula: str = ""
    custom_volatility_formula: str = ""


@dataclass
class AnalysisScope:
    version_field: str = "forecast_cycle"
    horizon_field: str = "forecast_period"
    baseline_version: str = "2026-03"
    current_version: str = "2026-06"
    period_start: str = "2027-01"
    period_end: str = "2028-12"
    grouping_fields: list[str] | None = None


@dataclass
class CustomConcept:
    name: str
    kind: str = "domain"
    description: str = ""
    connects_to: str = "ForecastRun"


@dataclass
class RuleSpec:
    rule_id: str
    name: str
    description: str
    severity: str
    rationale: str


CANONICAL_RULES = [
    RuleSpec(
        "CR-001",
        "Forecast version alignment",
        "Selected baseline and current forecast versions must be aligned over the same forecast horizon and target variables.",
        "error",
        "Forecast revision between forecast versions is meaningful only when both versions refer to the same future period.",
    ),
    RuleSpec(
        "CR-002",
        "Target coverage",
        "Every field with role=target must produce a RevisionMagnitudeSignal and VolatilitySignal for the selected analysis period.",
        "error",
        "A decision card is not meaningful unless each selected target is connected to interpretable signals.",
    ),
    RuleSpec(
        "CR-003",
        "Semantic metadata completeness",
        "Decision-relevant fields should have a business name, unit, semantic type, and direction.",
        "warning",
        "The tool should not treat columns as anonymous numbers; modelers must make their semantics explicit.",
    ),
    RuleSpec(
        "CR-004",
        "Method declaration",
        "Revision and volatility methods must be explicitly selected or defined before analysis.",
        "error",
        "Interpretability requires a named computation procedure, not hidden calculations.",
    ),
    RuleSpec(
        "CR-005",
        "Transformation traceability",
        "DecisionCards must trace to DatasetVersion, FieldModel, AnalysisScope, MethodSet, ForecastComparisonModel, and SignalModel.",
        "error",
        "The user must be able to inspect why a recommendation was produced and which transformation produced it.",
    ),
    RuleSpec(
        "CR-006",
        "Metamodel extensibility",
        "User-defined concepts must have a name, kind, description, and declared connection to an existing concept.",
        "warning",
        "A modeling workbench should allow domain concepts to be introduced without changing code.",
    ),
]


def method_catalog() -> dict[str, Any]:
    return {
        "revision_methods": [
            {
                "id": "version_to_version_pct",
                "name": "Version-to-version percentage revision",
                "formula": "((current_version(target,horizon) - baseline_version(target,horizon)) / baseline_version(target,horizon)) * 100",
                "requires": ["forecast_version", "forecast_horizon", "target"],
                "interpretation": "Best when the dataset contains multiple forecast cycles for the same future periods.",
            },
            {
                "id": "version_delta_abs",
                "name": "Absolute version delta",
                "formula": "current_version(target,horizon) - baseline_version(target,horizon)",
                "requires": ["forecast_version", "forecast_horizon", "target"],
                "interpretation": "Useful when units matter more than percentage movement.",
            },
            {
                "id": "latest_vs_history_pct",
                "name": "Latest value vs historical mean revision",
                "formula": "((actual - mean(history)) / mean(history)) * 100",
                "requires": ["target"],
                "interpretation": "Fallback when the data does not provide explicit forecast versions.",
            },
            {
                "id": "custom",
                "name": "Custom expression",
                "formula": "User expression using baseline, current, all_versions_mean, all_versions_std",
                "requires": ["depends on expression"],
                "interpretation": "For project-specific revision definitions declared by the modeler.",
            },
        ],
        "volatility_methods": [
            {
                "id": "version_dispersion_pct",
                "name": "Forecast-version dispersion over selected horizon",
                "formula": "std(all_versions(target,horizon)) / mean(all_versions(target,horizon)) * 100",
                "requires": ["forecast_version", "forecast_horizon", "target"],
                "interpretation": "Measures how unstable a target forecast is across available forecast cycles for the same horizon.",
            },
            {
                "id": "revision_instability_pct",
                "name": "Revision instability across consecutive versions",
                "formula": "std(pct_change(target across forecast versions for each horizon))",
                "requires": ["forecast_version", "forecast_horizon", "target"],
                "interpretation": "Measures whether forecast revisions themselves are unstable.",
            },
            {
                "id": "driver_instability_index",
                "name": "Driver instability index",
                "formula": "mean(std(pct_change(driver_i), horizon window)) across selected drivers",
                "requires": ["features"],
                "interpretation": "Shows whether uncertainty comes from upstream explanatory variables.",
            },
            {
                "id": "custom",
                "name": "Custom expression",
                "formula": "User expression using baseline, current, all_versions_mean, all_versions_std, driver_volatility",
                "requires": ["depends on expression"],
                "interpretation": "For project-specific volatility or risk formulas.",
            },
        ],
    }


def build_default_field_specs(columns: list[str], numeric_columns: list[str]) -> list[dict[str, Any]]:
    specs: list[FieldSpec] = []
    for col in columns:
        lower = col.lower()
        is_numeric = col in numeric_columns
        role = "feature" if is_numeric else "ignore"
        semantic_type = "identifier_or_text"
        unit = ""
        direction = "neutral"
        if lower in {"forecast_cycle", "forecast_version", "issue_date", "issue_month", "forecast_issue"}:
            role = "forecast_version"
            semantic_type = "forecast_issue_time"
        elif lower in {"forecast_period", "horizon", "target_period", "period", "month", "date"} or "forecast_period" in lower:
            role = "forecast_horizon"
            semantic_type = "forecast_target_time"
        elif lower in {"scenario", "case", "planning_scenario"}:
            role = "scenario"
            semantic_type = "planning_scenario"
        elif lower.startswith("feature") or any(token in lower for token in ["gdp", "temp", "industrial", "price", "weather", "income", "probability", "commitment", "renewable", "pue"]):
            role = "feature" if is_numeric else "scenario"
            semantic_type = "external_driver"
        elif lower.startswith("target") or any(token in lower for token in ["demand", "peak", "load", "revenue", "wcu", "mwh", "mw"]):
            role = "target" if is_numeric and "forecast" not in lower else "ignore"
            semantic_type = "forecast_target"
        elif lower.startswith("previous_forecast"):
            role = "previous_forecast"
            semantic_type = "forecast_cycle_output"
        elif lower.startswith("current_forecast"):
            role = "current_forecast"
            semantic_type = "forecast_cycle_output"

        if "mwh" in lower:
            unit = "MWh"
        elif "mw" in lower:
            unit = "MW"
        elif "temp" in lower:
            unit = "°C"
        elif "pct" in lower or "probability" in lower:
            unit = "%"
        elif "index" in lower:
            unit = "index"

        specs.append(
            FieldSpec(
                name=col,
                role=role,
                data_type="numeric" if is_numeric else "text",
                semantic_type=semantic_type,
                business_name=col.replace("_", " ").title(),
                unit=unit,
                description="Auto-discovered. Review and refine before analysis.",
                direction=direction,
                include_in_model=role in {"feature", "target", "forecast_version", "forecast_horizon", "scenario", "previous_forecast", "current_forecast"},
            )
        )
    return [asdict(spec) for spec in specs]


def build_metamodel(field_specs: list[dict[str, Any]], method_spec: dict[str, Any], scope: dict[str, Any], custom_concepts: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    """Return the ForeACT metamodel projected from the single Ecore source.

    The core metamodel is no longer duplicated here. It is maintained in
    backend/metamodel/foreact.ecore and projected into JSON at runtime.
    """
    from .metamodel_projection import ecore_to_graph

    metamodel = ecore_to_graph(custom_concepts or [])
    metamodel["runtime_summary"] = {
        "field_count": len(field_specs),
        "target_count": len([f for f in field_specs if f.get("role") == "target" and f.get("include_in_model", True)]),
        "driver_count": len([f for f in field_specs if f.get("role") == "feature" and f.get("include_in_model", True)]),
        "version_field_count": len([f for f in field_specs if f.get("role") == "forecast_version"]),
        "horizon_field_count": len([f for f in field_specs if f.get("role") == "forecast_horizon"]),
        "revision_method": method_spec.get("revision_method"),
        "volatility_method": method_spec.get("volatility_method"),
        "baseline_version": scope.get("baseline_version"),
        "current_version": scope.get("current_version"),
        "period_start": scope.get("period_start"),
        "period_end": scope.get("period_end"),
    }
    metamodel["conformance_rules"] = [asdict(rule) for rule in CANONICAL_RULES]
    return metamodel
