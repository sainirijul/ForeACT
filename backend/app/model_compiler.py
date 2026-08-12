from __future__ import annotations
from typing import Any
from .structural_validation import check_structural_conformance

ROLE_TO_CLASSIFIER = {
    "forecast_version": "VersionField",
    "forecast_horizon": "HorizonField",
    "target": "TargetField",
    "feature": "DriverField",
}


def build_dataset_version(
    package, dataset_columns: list[str] | None, row_count: int = 0
):
    DatasetVersion = package.getEClassifier("DatasetVersion")
    RawField = package.getEClassifier("RawField")
    dv = DatasetVersion()
    dv.rowCount = row_count
    raw_by_name = {}
    for col in dataset_columns or []:
        rf = RawField(name=col, columnName=col)
        dv.rawFields.append(rf)
        raw_by_name[col] = rf
    dv.columnCount = len(raw_by_name)
    return dv, raw_by_name


def build_field_model(package, field_specs: list[dict[str, Any]], raw_by_name: dict):
    FieldModel = package.getEClassifier("FieldModel")
    fm = FieldModel()
    by_role: dict[str, list] = {}

    for spec in field_specs:
        role = spec.get("role")
        classifier_name = ROLE_TO_CLASSIFIER.get(role)
        if classifier_name is None or not spec.get("include_in_model", True):
            continue
        Classifier = package.getEClassifier(classifier_name)
        field = Classifier(name=spec.get("name", ""))
        if spec.get("business_name"):
            field.businessName = spec["business_name"]
        if spec.get("unit"):
            field.unit = spec["unit"]
        if spec.get("semantic_type"):
            field.semanticType = spec["semantic_type"]
        source_col = raw_by_name.get(spec.get("name"))
        if source_col is not None:
            field.sourceColumn = source_col
        fm.fields.append(field)
        by_role.setdefault(role, []).append(field)

    for target_field in by_role.get("target", []):
        fm.targets.append(target_field)

    return fm, by_role


def build_method_set(package, method_spec: dict[str, Any] | None):
    MethodSet = package.getEClassifier("MethodSet")
    RevisionMethod = package.getEClassifier("RevisionMethod")
    VolatilityMethod = package.getEClassifier("VolatilityMethod")

    ms = MethodSet()
    method_spec = method_spec or {}

    if method_spec.get("revision_method"):
        rm = RevisionMethod(name=method_spec["revision_method"])
        rm.formula = method_spec.get("custom_revision_formula", "") or ""
        rm.largeRevisionMagnitudeThreshold = float(
            method_spec.get("revision_magnitude_threshold_large", 0.0) or 0.0
        )
        ms.revisionMethod = rm

    if method_spec.get("volatility_method"):
        vm = VolatilityMethod(name=method_spec["volatility_method"])
        vm.formula = method_spec.get("custom_volatility_formula", "") or ""
        vm.highVolatilityThreshold = float(
            method_spec.get("volatility_threshold_high", 0.0) or 0.0
        )
        ms.volatilityMethod = vm

    return ms


def build_comparison_scope(
    package, by_role: dict[str, list], scope: dict[str, Any] | None
):
    FCM = package.getEClassifier("ForecastComparisonModel")
    ForecastVintage = package.getEClassifier("ForecastVintage")
    fcm = FCM()
    scope = scope or {}

    version_fields = by_role.get("forecast_version", [])
    horizon_fields = by_role.get("forecast_horizon", [])
    if version_fields:
        fcm.versionField = version_fields[0]
    if horizon_fields:
        fcm.horizonField = horizon_fields[0]

    # Baseline/current vintages: at spec-validation time we only know which
    # forecast-version *values* were selected, not yet their ForecastValue
    # contents (those are populated once the dataset rows are analyzed).
    # A selected version string is modeled as a ForecastVintage stand-in so
    # that "a baseline and current vintage have been selected" is genuinely
    # checked, matching what the paper claims is validated at this stage.
    baseline_version = scope.get("baseline_version")
    current_version = scope.get("current_version")
    if baseline_version:
        bv = ForecastVintage(
            name=str(baseline_version), vintageDate=str(baseline_version)
        )
        fcm.vintages.append(bv)
        fcm.baselineVintage = bv
    if current_version:
        cv = ForecastVintage(
            name=str(current_version), vintageDate=str(current_version)
        )
        fcm.vintages.append(cv)
        fcm.currentVintage = cv

    return fcm


def compile_and_validate(
    package,
    spec: dict[str, Any],
    dataset_columns: list[str] | None = None,
    row_count: int = 0,
) -> dict[str, Any]:
    field_specs = spec.get("field_model", {}).get("fields", []) or []
    method_spec = spec.get("methodology_model", {}).get("methods", {}) or {}
    scope = spec.get("methodology_model", {}).get("scope", {}) or {}

    dataset_version, raw_by_name = build_dataset_version(
        package, dataset_columns, row_count
    )
    field_model, by_role = build_field_model(package, field_specs, raw_by_name)
    method_set = build_method_set(package, method_spec)
    comparison_scope = build_comparison_scope(package, by_role, scope)

    violations = []
    violations += check_structural_conformance(dataset_version, path="DatasetVersion")
    violations += check_structural_conformance(field_model, path="FieldModel")
    violations += check_structural_conformance(method_set, path="MethodSet")
    violations += check_structural_conformance(
        comparison_scope, path="ForecastComparisonModel"
    )

    results = (
        list(violations)
        if violations
        else [
            {
                "rule_id": "ECORE-STRUCT-001",
                "status": "pass",
                "severity": "error",
                "message": "All structural multiplicities declared in foreact.ecore are satisfied.",
            }
        ]
    )

    summary = {
        "instances": {
            "TargetField": len(by_role.get("target", [])),
            "DriverField": len(by_role.get("feature", [])),
            "VersionField": len(by_role.get("forecast_version", [])),
            "HorizonField": len(by_role.get("forecast_horizon", [])),
            "RevisionMethod": 1 if method_set.revisionMethod else 0,
            "VolatilityMethod": 1 if method_set.volatilityMethod else 0,
            "RawField": len(raw_by_name),
        }
    }
    return {"summary": summary, "conformance_results": results}
