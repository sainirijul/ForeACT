from __future__ import annotations
from typing import Any
from .metamodel_loader import load_foreact_package

REQUIRED_CLASSIFIERS = {
    "ForecastAssuranceProject",
    "DatasetVersion",
    "FieldModel",
    "SemanticField",
    "VersionField",
    "HorizonField",
    "TargetField",
    "MethodSet",
    "RevisionMethod",
    "VolatilityMethod",
    "ForecastComparisonModel",
    "ForecastVintage",
    "ForecastValue",
    "ForecastRevisionRecord",
    "ForecastVolatilityRecord",
    "SignalModel",
    "RevisionMagnitudeSignal",
    "VolatilitySignal",
    "ConfidenceSignal",
    "DecisionModel",
    "DecisionPolicy",
    "DecisionCard",
}


def _classifier_map(package):
    return {c.name: c for c in package.eClassifiers}


def compile_project_model(spec: dict[str, Any]) -> dict[str, Any]:
    """Compile the project specification into an Ecore-grounded typed summary.

    The compiler resolves every emitted type against the live Ecore package. The
    analytical pipeline still computes numeric records in pandas, while this
    function provides the structural model boundary used by conformance checks.
    """
    package = load_foreact_package()
    classifiers = _classifier_map(package)
    missing = sorted(REQUIRED_CLASSIFIERS - set(classifiers))
    if missing:
        raise ValueError(
            "Ecore metamodel is missing required classifiers: " + ", ".join(missing)
        )
    fields = spec.get("field_model", {}).get("fields", [])
    methods = spec.get("methodology_model", {}).get("methods", {})
    scope = spec.get("methodology_model", {}).get("scope", {})
    concepts = spec.get("metamodel_extension", {}).get("concepts", [])
    return {
        "metamodel": {"name": package.name, "nsURI": package.nsURI},
        "root_type": "ForecastAssuranceProject",
        "resolved_types": sorted(REQUIRED_CLASSIFIERS),
        "instances": {
            "DatasetVersion": 1 if spec.get("dataset") else 0,
            "FieldModel": 1,
            "SemanticField": len(fields),
            "TargetField": sum(
                f.get("role") == "target" and f.get("include_in_model", True)
                for f in fields
            ),
            "VersionField": sum(f.get("role") == "forecast_version" for f in fields),
            "HorizonField": sum(f.get("role") == "forecast_horizon" for f in fields),
            "RevisionMethod": 1 if methods.get("revision_method") else 0,
            "VolatilityMethod": 1 if methods.get("volatility_method") else 0,
            "ForecastComparisonModel": 1 if scope else 0,
            "DomainExtensionConcept": len(concepts),
        },
        "scope": scope,
    }
