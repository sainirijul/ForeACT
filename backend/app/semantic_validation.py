from __future__ import annotations

from typing import Any


def _result(
    rule_id: str,
    status: str,
    severity: str,
    path: str,
    message: str,
) -> dict[str, Any]:
    return {
        "rule_id": rule_id,
        "status": status,
        "severity": severity,
        "path": path,
        "message": message,
    }


def _contains_identity(values: Any, target: Any) -> bool:
    """Check membership using object identity for compiled Ecore objects."""
    return any(value is target for value in values)


def check_semantic_conformance(
    dataset_version: Any,
    field_model: Any,
    method_set: Any,
    comparison_model: Any,
) -> list[dict[str, Any]]:
    """
    Validate semantic relationships that cannot be expressed by
    Ecore multiplicities alone.

    These rules operate on compiled Ecore instances rather than
    the original JSON/Python specification.
    """
    results: list[dict[str, Any]] = []

    # ------------------------------------------------------------------
    # SEM-001: baseline and current vintages must be different
    # ------------------------------------------------------------------
    baseline = comparison_model.baselineVintage
    current = comparison_model.currentVintage

    if baseline is not None and current is not None:
        if baseline is current:
            results.append(
                _result(
                    "SEM-001",
                    "fail",
                    "error",
                    "ForecastComparisonModel.baselineVintage",
                    "Baseline and current forecast vintages must be different.",
                )
            )
        else:
            results.append(
                _result(
                    "SEM-001",
                    "pass",
                    "error",
                    "ForecastComparisonModel",
                    "Baseline and current forecast vintages are distinct.",
                )
            )

    # ------------------------------------------------------------------
    # SEM-002: selected vintages must belong to the model's vintage set
    # ------------------------------------------------------------------
    vintages = list(comparison_model.vintages)

    for name, vintage, path in [
        (
            "baseline",
            baseline,
            "ForecastComparisonModel.baselineVintage",
        ),
        (
            "current",
            current,
            "ForecastComparisonModel.currentVintage",
        ),
    ]:
        if vintage is None:
            # The Ecore multiplicity validator handles required references.
            continue

        if _contains_identity(vintages, vintage):
            results.append(
                _result(
                    f"SEM-002-{name.upper()}",
                    "pass",
                    "error",
                    path,
                    f"Selected {name} vintage belongs to ForecastComparisonModel.vintages.",
                )
            )
        else:
            results.append(
                _result(
                    f"SEM-002-{name.upper()}",
                    "fail",
                    "error",
                    path,
                    f"Selected {name} vintage must belong to ForecastComparisonModel.vintages.",
                )
            )

    # ------------------------------------------------------------------
    # SEM-003: version/horizon fields must belong to FieldModel.fields
    # ------------------------------------------------------------------
    fields = list(field_model.fields)

    version_field = comparison_model.versionField
    horizon_field = comparison_model.horizonField

    if version_field is not None:
        if _contains_identity(fields, version_field):
            results.append(
                _result(
                    "SEM-003-VERSION",
                    "pass",
                    "error",
                    "ForecastComparisonModel.versionField",
                    "The selected version field belongs to FieldModel.fields.",
                )
            )
        else:
            results.append(
                _result(
                    "SEM-003-VERSION",
                    "fail",
                    "error",
                    "ForecastComparisonModel.versionField",
                    "The selected version field must belong to FieldModel.fields.",
                )
            )

    if horizon_field is not None:
        if _contains_identity(fields, horizon_field):
            results.append(
                _result(
                    "SEM-003-HORIZON",
                    "pass",
                    "error",
                    "ForecastComparisonModel.horizonField",
                    "The selected horizon field belongs to FieldModel.fields.",
                )
            )
        else:
            results.append(
                _result(
                    "SEM-003-HORIZON",
                    "fail",
                    "error",
                    "ForecastComparisonModel.horizonField",
                    "The selected horizon field must belong to FieldModel.fields.",
                )
            )

    # ------------------------------------------------------------------
    # SEM-004: targets must be members of FieldModel.fields
    # ------------------------------------------------------------------
    for target in list(field_model.targets):
        if _contains_identity(fields, target):
            results.append(
                _result(
                    "SEM-004",
                    "pass",
                    "error",
                    "FieldModel.targets",
                    f"Target field '{target.name}' belongs to FieldModel.fields.",
                )
            )
        else:
            results.append(
                _result(
                    "SEM-004",
                    "fail",
                    "error",
                    "FieldModel.targets",
                    f"Target field '{target.name}' must belong to FieldModel.fields.",
                )
            )

    # ------------------------------------------------------------------
    # SEM-005: every modeled field's sourceColumn must belong to
    # DatasetVersion.rawFields
    # ------------------------------------------------------------------
    raw_fields = list(dataset_version.rawFields)

    for field in fields:
        source_column = getattr(field, "sourceColumn", None)

        if source_column is None:
            # Required sourceColumn multiplicity is handled structurally.
            continue

        if _contains_identity(raw_fields, source_column):
            results.append(
                _result(
                    "SEM-005",
                    "pass",
                    "error",
                    f"FieldModel.fields[{field.name}].sourceColumn",
                    f"Source column for '{field.name}' belongs to DatasetVersion.rawFields.",
                )
            )
        else:
            results.append(
                _result(
                    "SEM-005",
                    "fail",
                    "error",
                    f"FieldModel.fields[{field.name}].sourceColumn",
                    f"Source column for '{field.name}' must belong to DatasetVersion.rawFields.",
                )
            )

    # ------------------------------------------------------------------
    # SEM-006: only one version field should be selected by the compiler
    # ------------------------------------------------------------------
    version_fields = [field for field in fields if field.eClass.name == "VersionField"]

    if len(version_fields) <= 1:
        results.append(
            _result(
                "SEM-006",
                "pass",
                "error",
                "FieldModel.fields",
                "At most one VersionField is present in the compiled field model.",
            )
        )
    else:
        results.append(
            _result(
                "SEM-006",
                "fail",
                "error",
                "FieldModel.fields",
                (
                    "Multiple VersionField instances are present. "
                    "ForecastComparisonModel currently selects the first one, "
                    "which would make the configuration ambiguous."
                ),
            )
        )

    # ------------------------------------------------------------------
    # SEM-007: only one horizon field should be selected by the compiler
    # ------------------------------------------------------------------
    horizon_fields = [field for field in fields if field.eClass.name == "HorizonField"]

    if len(horizon_fields) <= 1:
        results.append(
            _result(
                "SEM-007",
                "pass",
                "error",
                "FieldModel.fields",
                "At most one HorizonField is present in the compiled field model.",
            )
        )
    else:
        results.append(
            _result(
                "SEM-007",
                "fail",
                "error",
                "FieldModel.fields",
                (
                    "Multiple HorizonField instances are present. "
                    "ForecastComparisonModel currently selects the first one, "
                    "which would make the configuration ambiguous."
                ),
            )
        )

    return results
