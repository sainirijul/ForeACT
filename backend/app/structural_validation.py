from __future__ import annotations
from typing import Any


def check_structural_conformance(
    instance: Any, path: str = "root", _seen: set | None = None
) -> list[dict[str, Any]]:
    if _seen is None:
        _seen = set()
    if id(instance) in _seen:
        return []
    _seen.add(id(instance))

    violations: list[dict[str, Any]] = []
    for feature in instance.eClass.eAllStructuralFeatures():
        value = instance.eGet(feature)
        if feature.many:
            count = len(value)
            children = list(value)
        else:
            count = 0 if value is None else 1
            children = [value] if value is not None else []

        if count < feature.lowerBound:
            violations.append(
                {
                    "rule_id": f"ECORE-MULT-{instance.eClass.name}.{feature.name}",
                    "path": f"{path}.{feature.name}",
                    "status": "fail",
                    "severity": "error",
                    "message": (
                        f"{instance.eClass.name}.{feature.name} requires at least "
                        f"{feature.lowerBound} value(s) per foreact.ecore, found {count}."
                    ),
                }
            )
        if feature.upperBound != -1 and count > feature.upperBound:
            violations.append(
                {
                    "rule_id": f"ECORE-MULT-{instance.eClass.name}.{feature.name}",
                    "path": f"{path}.{feature.name}",
                    "status": "fail",
                    "severity": "error",
                    "message": (
                        f"{instance.eClass.name}.{feature.name} allows at most "
                        f"{feature.upperBound} value(s) per foreact.ecore, found {count}."
                    ),
                }
            )

        if getattr(feature, "containment", False):
            for child in children:
                violations.extend(
                    check_structural_conformance(
                        child, path=f"{path}.{feature.name}", _seen=_seen
                    )
                )
    return violations
