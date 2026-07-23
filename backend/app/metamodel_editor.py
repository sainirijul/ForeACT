from __future__ import annotations

from pathlib import Path
from typing import Any
import re
import xml.etree.ElementTree as ET

from app.metamodel_loader import METAMODEL_PATH, clear_metamodel_cache

ECORE_NS = "http://www.eclipse.org/emf/2002/Ecore"
XMI_NS = "http://www.omg.org/XMI"
XSI_NS = "http://www.w3.org/2001/XMLSchema-instance"

ET.register_namespace("ecore", ECORE_NS)
ET.register_namespace("xmi", XMI_NS)
ET.register_namespace("xsi", XSI_NS)


PROTECTED_CLASSES = {
    "ModelElement",
    "ForecastAssuranceProject",
    "DatasetVersion",
    "RawField",
    "FieldModel",
    "SemanticField",
    "MethodSet",
    "AnalysisMethod",
    "Signal",
    "DecisionModel",
}


def _xsi_type() -> str:
    return f"{{{XSI_NS}}}type"


def _safe_name(name: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_]", "", name.strip())
    if not cleaned:
        raise ValueError("Class or feature name cannot be empty.")
    if cleaned[0].isdigit():
        cleaned = f"_{cleaned}"
    return cleaned


def _ecore_type(type_name: str) -> str:
    builtins = {
        "EString",
        "EInt",
        "EDouble",
        "EBoolean",
        "EDate",
        "ELong",
        "EFloat",
    }

    if type_name in builtins:
        return f"ecore:EDataType {ECORE_NS}#//{type_name}"

    return f"#//{type_name}"


def _load_tree() -> tuple[ET.ElementTree, ET.Element]:
    path = Path(METAMODEL_PATH)
    tree = ET.parse(path)
    root = tree.getroot()
    return tree, root


def _save_tree(tree: ET.ElementTree) -> None:
    path = Path(METAMODEL_PATH)
    tree.write(path, encoding="UTF-8", xml_declaration=True)
    clear_metamodel_cache()


def _classifiers(root: ET.Element) -> list[ET.Element]:
    return list(root.findall("eClassifiers"))


def _find_class(root: ET.Element, class_name: str) -> ET.Element | None:
    for classifier in _classifiers(root):
        if classifier.get("name") == class_name:
            xsi_type = classifier.get(_xsi_type())
            if xsi_type == "ecore:EClass":
                return classifier
    return None


def _class_exists(root: ET.Element, class_name: str) -> bool:
    return _find_class(root, class_name) is not None


def _is_enum_or_class(root: ET.Element, name: str) -> bool:
    for classifier in _classifiers(root):
        if classifier.get("name") == name:
            return True
    return False


def add_class(payload: dict[str, Any]) -> dict[str, Any]:
    tree, root = _load_tree()

    class_name = _safe_name(payload.get("name", ""))
    if _class_exists(root, class_name):
        raise ValueError(f"Class '{class_name}' already exists.")

    super_type = payload.get("superType") or payload.get("extends") or "ModelElement"
    super_type = _safe_name(super_type)

    if not _class_exists(root, super_type):
        raise ValueError(f"Super type '{super_type}' does not exist.")

    new_class = ET.SubElement(root, "eClassifiers")
    new_class.set(_xsi_type(), "ecore:EClass")
    new_class.set("name", class_name)
    new_class.set("eSuperTypes", f"#//{super_type}")

    if payload.get("abstract"):
        new_class.set("abstract", "true")

    for attr in payload.get("attributes", []) or []:
        add_attribute_to_class_element(new_class, attr)

    for ref in payload.get("references", []) or []:
        add_reference_to_class_element(root, new_class, ref)

    _save_tree(tree)

    return {
        "status": "ok",
        "message": f"Class '{class_name}' added.",
        "className": class_name,
    }


def delete_class(class_name: str) -> dict[str, Any]:
    tree, root = _load_tree()

    class_name = _safe_name(class_name)

    if class_name in PROTECTED_CLASSES:
        raise ValueError(
            f"Class '{class_name}' is protected because ForeACT depends on it."
        )

    class_element = _find_class(root, class_name)
    if class_element is None:
        raise ValueError(f"Class '{class_name}' does not exist.")

    # Remove the class itself
    root.remove(class_element)

    # Remove references targeting the deleted class
    for classifier in _classifiers(root):
        for feature in list(classifier.findall("eStructuralFeatures")):
            if feature.get("eType") == f"#//{class_name}":
                classifier.remove(feature)

        # Remove from inheritance lists
        super_types = classifier.get("eSuperTypes")
        if super_types:
            remaining = [
                item for item in super_types.split() if item != f"#//{class_name}"
            ]
            if remaining:
                classifier.set("eSuperTypes", " ".join(remaining))
            elif "eSuperTypes" in classifier.attrib:
                del classifier.attrib["eSuperTypes"]

    _save_tree(tree)

    return {
        "status": "ok",
        "message": f"Class '{class_name}' deleted.",
        "className": class_name,
    }


def add_attribute_to_class_element(
    class_element: ET.Element, attr: dict[str, Any]
) -> None:
    attr_name = _safe_name(attr.get("name", ""))
    attr_type = attr.get("type") or "EString"

    if _feature_exists(class_element, attr_name):
        raise ValueError(
            f"Feature '{attr_name}' already exists on class '{class_element.get('name')}'."
        )

    feature = ET.SubElement(class_element, "eStructuralFeatures")
    feature.set(_xsi_type(), "ecore:EAttribute")
    feature.set("name", attr_name)
    feature.set("eType", _ecore_type(attr_type))

    lower = attr.get("lowerBound")
    upper = attr.get("upperBound")

    if lower is not None:
        feature.set("lowerBound", str(lower))
    if upper is not None:
        feature.set("upperBound", "-1" if str(upper) == "*" else str(upper))


def add_reference_to_class_element(
    root: ET.Element,
    class_element: ET.Element,
    ref: dict[str, Any],
) -> None:
    ref_name = _safe_name(ref.get("name", ""))
    target = _safe_name(ref.get("target", ""))

    if not _is_enum_or_class(root, target):
        raise ValueError(f"Reference target '{target}' does not exist.")

    if _feature_exists(class_element, ref_name):
        raise ValueError(
            f"Feature '{ref_name}' already exists on class '{class_element.get('name')}'."
        )

    feature = ET.SubElement(class_element, "eStructuralFeatures")
    feature.set(_xsi_type(), "ecore:EReference")
    feature.set("name", ref_name)
    feature.set("eType", f"#//{target}")

    if ref.get("containment"):
        feature.set("containment", "true")

    lower = ref.get("lowerBound")
    upper = ref.get("upperBound")

    if lower is not None:
        feature.set("lowerBound", str(lower))
    if upper is not None:
        feature.set("upperBound", "-1" if str(upper) == "*" else str(upper))


def _feature_exists(class_element: ET.Element, feature_name: str) -> bool:
    for feature in class_element.findall("eStructuralFeatures"):
        if feature.get("name") == feature_name:
            return True
    return False


def add_attribute(class_name: str, payload: dict[str, Any]) -> dict[str, Any]:
    tree, root = _load_tree()

    class_name = _safe_name(class_name)
    class_element = _find_class(root, class_name)

    if class_element is None:
        raise ValueError(f"Class '{class_name}' does not exist.")

    add_attribute_to_class_element(class_element, payload)

    _save_tree(tree)

    return {
        "status": "ok",
        "message": f"Attribute added to '{class_name}'.",
        "className": class_name,
    }


def delete_attribute(class_name: str, attribute_name: str) -> dict[str, Any]:
    tree, root = _load_tree()

    class_name = _safe_name(class_name)
    attribute_name = _safe_name(attribute_name)

    class_element = _find_class(root, class_name)

    if class_element is None:
        raise ValueError(f"Class '{class_name}' does not exist.")

    for feature in list(class_element.findall("eStructuralFeatures")):
        if (
            feature.get("name") == attribute_name
            and feature.get(_xsi_type()) == "ecore:EAttribute"
        ):
            class_element.remove(feature)
            _save_tree(tree)

            return {
                "status": "ok",
                "message": f"Attribute '{attribute_name}' deleted from '{class_name}'.",
                "className": class_name,
                "attributeName": attribute_name,
            }

    raise ValueError(
        f"Attribute '{attribute_name}' does not exist on class '{class_name}'."
    )


def add_reference(class_name: str, payload: dict[str, Any]) -> dict[str, Any]:
    tree, root = _load_tree()

    class_name = _safe_name(class_name)
    class_element = _find_class(root, class_name)

    if class_element is None:
        raise ValueError(f"Class '{class_name}' does not exist.")

    add_reference_to_class_element(root, class_element, payload)

    _save_tree(tree)

    return {
        "status": "ok",
        "message": f"Reference added to '{class_name}'.",
        "className": class_name,
    }
