from __future__ import annotations

from typing import Any

from app.metamodel_loader import METAMODEL_PATH, load_foreact_package


def _safe_name(obj: Any) -> str:
    return getattr(obj, "name", None) or str(obj)


def _upper_bound(value: int) -> str | int:
    return "*" if value == -1 else value


def _type_name(etype: Any) -> str:
    if etype is None:
        return "EObject"
    return _safe_name(etype)


def _layout_position(index: int, package_name: str, class_name: str | None = None) -> dict[str, int]:
    """Deterministic readable layout for the ForeACT metamodel canvas.

    The previous layout stacked packages vertically over ~2000px. React Flow
    then fit the whole graph into the viewport and the metamodel looked almost
    invisible. This layout keeps the core language in a compact left-to-right
    modeling view so users can read classes and associations immediately.
    """
    positions = {
        # core/root
        "ModelElement": (40, 40),
        "ForecastAssuranceProject": (40, 210),

        # data and semantic field modeling
        "DatasetVersion": (340, 40),
        "RawField": (340, 210),
        "FieldModel": (640, 40),
        "SemanticField": (640, 210),
        "VersionField": (460, 410),
        "HorizonField": (700, 410),
        "TargetField": (940, 410),
        "DriverField": (1180, 410),

        # scenario and evidence
        "ScenarioModel": (340, 650),
        "AssumptionElement": (640, 650),
        "ScenarioAssumption": (520, 840),
        "DataCenterCommitment": (780, 840),
        "EvidenceArtifact": (1060, 650),

        # methods and comparison
        "MethodSet": (40, 650),
        "AnalysisMethod": (40, 840),
        "VarianceMethod": (40, 1040),
        "VolatilityMethod": (280, 1040),
        "ConfidenceMethod": (520, 1040),
        "ForecastComparisonModel": (940, 40),
        "ForecastComparisonRecord": (1180, 210),

        # signals and decisions
        "SignalModel": (1420, 40),
        "Signal": (1420, 240),
        "VarianceSignal": (1220, 470),
        "VolatilitySignal": (1460, 470),
        "ConfidenceSignal": (1700, 470),
        "DecisionModel": (1420, 760),
        "DecisionPolicy": (1180, 960),
        "DecisionRule": (1420, 960),
        "DecisionCard": (1660, 960),
    }
    if class_name in positions:
        x, y = positions[class_name]
        return {"x": x, "y": y}

    # Fallback for future Ecore classes.
    package_offsets = {
        "Core": (40, 1240),
        "Project": (280, 1240),
        "Data": (520, 1240),
        "Semantics": (760, 1240),
        "Scenario": (1000, 1240),
        "Methodology": (1240, 1240),
        "Comparison": (1480, 1240),
        "Signals": (1720, 1240),
        "Decision": (1960, 1240),
    }
    base_x, base_y = package_offsets.get(package_name, (40, 1460))
    return {"x": base_x + (index % 2) * 240, "y": base_y + (index // 2) * 160}


def _package_for(name: str) -> str:
    if name in {"ModelElement"}:
        return "Core"
    if name == "ForecastAssuranceProject":
        return "Project"
    if name in {"DatasetVersion", "RawField"}:
        return "Data"
    if name in {"FieldModel", "SemanticField", "VersionField", "HorizonField", "TargetField", "DriverField"}:
        return "Semantics"
    if name in {"ScenarioModel", "AssumptionElement", "ScenarioAssumption", "DataCenterCommitment", "EvidenceArtifact"}:
        return "Scenario"
    if name in {"MethodSet", "AnalysisMethod", "VarianceMethod", "VolatilityMethod", "ConfidenceMethod"}:
        return "Methodology"
    if name in {"ForecastComparisonModel", "ForecastComparisonRecord"}:
        return "Comparison"
    if name in {"SignalModel", "Signal", "VarianceSignal", "VolatilitySignal", "ConfidenceSignal"}:
        return "Signals"
    if name in {"DecisionModel", "DecisionPolicy", "DecisionRule", "DecisionCard"}:
        return "Decision"
    return "Extension"



def _ecore_to_graph_without_pyecore(custom_concepts: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    """Small XML fallback so the demo can still render before Poetry installs PyEcore."""
    import xml.etree.ElementTree as ET

    tree = ET.parse(METAMODEL_PATH)
    root = tree.getroot()
    ns = {"xsi": "http://www.w3.org/2001/XMLSchema-instance"}
    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    enums: list[dict[str, Any]] = []
    classes: list[dict[str, Any]] = []

    classifiers = list(root.findall("eClassifiers"))
    index = 0
    for classifier in classifiers:
        xtype = classifier.attrib.get("{http://www.w3.org/2001/XMLSchema-instance}type", "")
        name = classifier.attrib.get("name", "")
        if not name:
            continue
        if xtype.endswith("EEnum"):
            enums.append({"name": name, "literals": [lit.attrib.get("name", "") for lit in classifier.findall("eLiterals")]})
            continue
        if not xtype.endswith("EClass"):
            continue
        attrs, refs = [], []
        package_name = _package_for(name)
        abstract = classifier.attrib.get("abstract") == "true"
        for feature in classifier.findall("eStructuralFeatures"):
            ftype = feature.attrib.get("{http://www.w3.org/2001/XMLSchema-instance}type", "")
            fname = feature.attrib.get("name", "")
            etype = feature.attrib.get("eType", "EObject").split("#//")[-1].split("//")[-1]
            lb = int(feature.attrib.get("lowerBound", "0"))
            ub = int(feature.attrib.get("upperBound", "1"))
            if ftype.endswith("EAttribute"):
                attrs.append({"name": fname, "type": etype, "lowerBound": lb, "upperBound": _upper_bound(ub)})
            elif ftype.endswith("EReference"):
                containment = feature.attrib.get("containment") == "true"
                refs.append({"name": fname, "target": etype, "containment": containment, "lowerBound": lb, "upperBound": _upper_bound(ub)})
                edges.append({"source": name, "target": etype, "label": ("◆ " if containment else "") + fname, "kind": "composition" if containment else "association"})
        for super_ref in classifier.attrib.get("eSuperTypes", "").split():
            super_name = super_ref.split("#//")[-1]
            if super_name:
                edges.append({"source": name, "target": super_name, "label": "extends", "kind": "inheritance"})
        node = {"id": name, "label": name, "kind": "abstract" if abstract else "class", "package": package_name, "stereotype": "abstract EClass" if abstract else "EClass", "abstract": abstract, "count": 1, "attributes": attrs, "references": refs, "position": _layout_position(index, package_name, name), "isCore": True}
        nodes.append(node); classes.append(node); index += 1

    for i, concept in enumerate(custom_concepts or []):
        name = str(concept.get("name") or f"ExtensionConcept{i+1}").strip().replace(" ", "")
        attrs = concept.get("attributes") or [{"name": "name", "type": "EString", "lowerBound": 0, "upperBound": 1}]
        refs = concept.get("references") or []
        nodes.append({"id": name, "label": concept.get("name") or name, "kind": concept.get("kind") or "extension", "package": "Use-case Extension", "stereotype": concept.get("stereotype") or "EClass", "abstract": bool(concept.get("abstract")), "count": 1, "attributes": attrs, "references": refs, "position": {"x": concept.get("x", 40 + (i % 3) * 320), "y": concept.get("y", 2200 + (i // 3) * 170)}, "isCore": False})
        connects_to = str(concept.get("connects_to") or "AssumptionElement").replace(" ", "")
        edges.append({"source": name, "target": connects_to, "label": "extends", "kind": "inheritance"})
        for ref in refs:
            target = str(ref.get("target") or "").replace(" ", "")
            if target:
                edges.append({"source": name, "target": target, "label": ref.get("name", "relatesTo"), "kind": "association"})

    return {"name": "ForeACT Forecast Assurance Metamodel", "version": "1.0.0", "source": str(METAMODEL_PATH), "nsURI": "http://foreact/model", "intent": "Single-source Ecore metamodel for forecast-change actionability assessment.", "classes": classes, "enums": enums, "graph": {"nodes": nodes, "edges": edges}}


def ecore_to_graph(custom_concepts: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    """Project the single Ecore metamodel into frontend-friendly graph JSON."""
    try:
        from pyecore.ecore import EAttribute, EClass, EEnum, EReference
        package = load_foreact_package()
    except Exception:
        return _ecore_to_graph_without_pyecore(custom_concepts)
    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    classes: list[dict[str, Any]] = []
    enums: list[dict[str, Any]] = []

    class_index = 0
    for classifier in package.eClassifiers:
        if isinstance(classifier, EEnum):
            enums.append({"name": classifier.name, "literals": [literal.name for literal in classifier.eLiterals]})
            continue
        if not isinstance(classifier, EClass):
            continue

        package_name = _package_for(classifier.name)
        attrs = []
        refs = []
        for feature in classifier.eStructuralFeatures:
            if isinstance(feature, EAttribute):
                attrs.append({
                    "name": feature.name,
                    "type": _type_name(feature.eType),
                    "lowerBound": int(feature.lowerBound),
                    "upperBound": _upper_bound(int(feature.upperBound)),
                })
            elif isinstance(feature, EReference):
                refs.append({
                    "name": feature.name,
                    "target": _type_name(feature.eType),
                    "containment": bool(feature.containment),
                    "lowerBound": int(feature.lowerBound),
                    "upperBound": _upper_bound(int(feature.upperBound)),
                })
                edges.append({
                    "source": classifier.name,
                    "target": _type_name(feature.eType),
                    "label": ("◆ " if feature.containment else "") + feature.name,
                    "kind": "composition" if feature.containment else "association",
                })

        for super_type in classifier.eSuperTypes:
            edges.append({
                "source": classifier.name,
                "target": super_type.name,
                "label": "extends",
                "kind": "inheritance",
            })

        node = {
            "id": classifier.name,
            "label": classifier.name,
            "kind": "abstract" if classifier.abstract else "class",
            "package": package_name,
            "stereotype": "abstract EClass" if classifier.abstract else "EClass",
            "abstract": bool(classifier.abstract),
            "count": 1,
            "attributes": attrs,
            "references": refs,
            "position": _layout_position(class_index, package_name, classifier.name),
            "isCore": True,
        }
        nodes.append(node)
        classes.append(node)
        class_index += 1

    for i, concept in enumerate(custom_concepts or []):
        name = str(concept.get("name") or f"ExtensionConcept{i+1}").strip().replace(" ", "")
        attrs = concept.get("attributes") or [{"name": "name", "type": "EString", "lowerBound": 0, "upperBound": 1}]
        refs = concept.get("references") or []
        nodes.append({
            "id": name,
            "label": concept.get("name") or name,
            "kind": concept.get("kind") or "extension",
            "package": "Use-case Extension",
            "stereotype": concept.get("stereotype") or "EClass",
            "abstract": bool(concept.get("abstract")),
            "count": 1,
            "attributes": attrs,
            "references": refs,
            "position": {"x": concept.get("x", 40 + (i % 3) * 320), "y": concept.get("y", 2200 + (i // 3) * 170)},
            "isCore": False,
        })
        connects_to = str(concept.get("connects_to") or "AssumptionElement").replace(" ", "")
        if connects_to:
            edges.append({"source": name, "target": connects_to, "label": "extends", "kind": "inheritance"})
        for ref in refs:
            target = str(ref.get("target") or "").replace(" ", "")
            if target:
                edges.append({"source": name, "target": target, "label": ref.get("name", "relatesTo"), "kind": "association"})

    return {
        "name": "ForeACT Forecast Assurance Metamodel",
        "version": "1.0.0",
        "source": str(METAMODEL_PATH),
        "nsURI": getattr(package, "nsURI", "http://foreact/model"),
        "intent": "Single-source Ecore metamodel for forecast-change actionability assessment.",
        "classes": classes,
        "enums": enums,
        "graph": {"nodes": nodes, "edges": edges},
    }
