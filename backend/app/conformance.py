from __future__ import annotations
from typing import Any
from .model_compiler import compile_project_model


def validate_project_spec_against_metamodel(
    spec: dict[str, Any],
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    results: list[dict[str, Any]] = []
    try:
        compiled = compile_project_model(spec)
        results.append(
            {
                "rule_id": "ECORE-001",
                "status": "pass",
                "severity": "error",
                "message": "All required project types resolve against the active Ecore metamodel.",
            }
        )
    except Exception as exc:
        return {}, [
            {
                "rule_id": "ECORE-001",
                "status": "fail",
                "severity": "error",
                "message": str(exc),
            }
        ]
    counts = compiled["instances"]
    required = {
        "DatasetVersion": 1,
        "VersionField": 1,
        "HorizonField": 1,
        "TargetField": 1,
        "RevisionMethod": 1,
        "VolatilityMethod": 1,
    }
    missing = [
        name for name, minimum in required.items() if counts.get(name, 0) < minimum
    ]
    results.append(
        {
            "rule_id": "ECORE-002",
            "status": "pass" if not missing else "fail",
            "severity": "error",
            "message": (
                "Required model elements are present."
                if not missing
                else "Missing required model elements: " + ", ".join(missing)
            ),
        }
    )
    return compiled, results
