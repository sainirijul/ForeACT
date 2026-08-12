from __future__ import annotations
from typing import Any

from .metamodel_loader import load_foreact_package
from .model_compiler import compile_and_validate


def validate_project_spec_against_metamodel(
    spec: dict[str, Any],
    dataset_columns: list[str] | None = None,
    row_count: int = 0,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    results: list[dict[str, Any]] = []

    try:
        package = load_foreact_package()
    except Exception as exc:
        return {}, [
            {
                "rule_id": "ECORE-001",
                "status": "fail",
                "severity": "error",
                "message": str(exc),
            }
        ]

    results.append(
        {
            "rule_id": "ECORE-001",
            "status": "pass",
            "severity": "error",
            "message": "All required project types resolve against the active Ecore metamodel.",
        }
    )

    try:
        compiled = compile_and_validate(
            package, spec, dataset_columns=dataset_columns, row_count=row_count
        )
    except Exception as exc:
        results.append(
            {
                "rule_id": "ECORE-002",
                "status": "fail",
                "severity": "error",
                "message": f"Project specification could not be compiled against the metamodel: {exc}",
            }
        )
        return {}, results

    results.extend(compiled["conformance_results"])
    return compiled["summary"], results
