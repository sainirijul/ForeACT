from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

XSI_TYPE = "{http://www.w3.org/2001/XMLSchema-instance}type"

def local_type(value: str | None) -> str:
    if not value:
        return ""
    return value.split(":")[-1]

def local_tag(tag: str) -> str:
    return tag.split("}")[-1]

def ecore_type(value: str | None) -> str:
    if not value:
        return ""
    if "#//" in value:
        return value.split("#//")[-1]
    return value.split(":")[-1]

def multiplicity(lower: str | None, upper: str | None) -> str:
    lower = lower if lower is not None else "0"
    upper = upper if upper is not None else "1"
    if upper == "-1":
        upper = "*"
    if lower == upper:
        return lower
    return f"{lower}..{upper}"

def ecore_to_plantuml(ecore_path: str | Path, custom_concepts: list[dict[str, Any]] | None = None) -> str:
    ecore_path = Path(ecore_path)
    tree = ET.parse(ecore_path)
    root = tree.getroot()

    lines: list[str] = [
        "@startuml",
        "hide empty members",
        "skinparam classAttributeIconSize 0",
        "skinparam linetype ortho",
        "",
    ]

    classes: dict[str, ET.Element] = {}
    enums: dict[str, ET.Element] = {}
    datatypes: dict[str, ET.Element] = {}

    for element in root.iter():
        element_type = local_type(element.attrib.get(XSI_TYPE))
        name = element.attrib.get("name")
        if not name:
            continue
        if element_type == "EClass":
            classes[name] = element
        elif element_type == "EEnum":
            enums[name] = element
        elif element_type == "EDataType":
            datatypes[name] = element

    # =========================================================
    # Classes & Custom Extensions
    # =========================================================
    for class_name, element in classes.items():
        if element.attrib.get("abstract") == "true":
            lines.append(f"abstract class {class_name}")
        else:
            lines.append(f"class {class_name}")

    if custom_concepts:
        for concept in custom_concepts:
            c_name = str(concept.get("name") or "").strip().replace(" ", "")
            if c_name:
                lines.append(f"class {c_name} <<extension>>")

    lines.append("")

    # =========================================================
    # Enums
    # =========================================================
    for enum_name, element in enums.items():
        lines.append(f"enum {enum_name} {{")
        for child in element:
            child_type = local_type(child.attrib.get(XSI_TYPE))
            tag = local_tag(child.tag)
            if child_type != "EEnumLiteral" and tag != "eLiterals":
                continue
            literal_name = child.attrib.get("name")
            if not literal_name:
                continue
            literal_value = child.attrib.get("value")
            if literal_value is not None:
                lines.append(f"    {literal_name} = {literal_value}")
            else:
                lines.append(f"    {literal_name}")
        lines.append("}")

    lines.append("")

    # =========================================================
    # EDataTypes
    # =========================================================
    for datatype_name, element in datatypes.items():
        lines.append(f"class {datatype_name} <<datatype>>")
        instance_class = element.attrib.get("instanceClassName")
        if instance_class:
            lines.append(f"{datatype_name} : instanceClassName: {instance_class}")

    if datatypes:
        lines.append("")

    # =========================================================
    # Attributes
    # =========================================================
    for class_name, element in classes.items():
        for child in element:
            child_type = local_type(child.attrib.get(XSI_TYPE))
            if child_type != "EAttribute":
                continue
            attr_name = child.attrib.get("name")
            if not attr_name:
                continue
            attr_type = ecore_type(child.attrib.get("eType"))
            if attr_type:
                lines.append(f"{class_name} : {attr_name}: {attr_type}")
            else:
                lines.append(f"{class_name} : {attr_name}")

    lines.append("")

    # =========================================================
    # Operations
    # =========================================================
    for class_name, element in classes.items():
        for child in element:
            child_type = local_type(child.attrib.get(XSI_TYPE))
            if child_type != "EOperation":
                continue
            operation_name = child.attrib.get("name")
            if not operation_name:
                continue
            parameters = []
            for parameter in child:
                parameter_type = local_type(parameter.attrib.get(XSI_TYPE))
                if parameter_type != "EParameter":
                    continue
                parameter_name = parameter.attrib.get("name")
                parameter_e_type = ecore_type(parameter.attrib.get("eType"))
                if parameter_name and parameter_e_type:
                    parameters.append(f"{parameter_name}: {parameter_e_type}")
                elif parameter_name:
                    parameters.append(parameter_name)
            
            return_type = ""
            for operation_child in child:
                operation_child_type = local_type(operation_child.attrib.get(XSI_TYPE))
                if operation_child_type != "EParameter":
                    continue
                parameter_name = operation_child.attrib.get("name")
                if parameter_name:
                    continue
                parameter_e_type = ecore_type(operation_child.attrib.get("eType"))
                if parameter_e_type:
                    return_type = parameter_e_type
                    break
            
            signature = f"{operation_name}({', '.join(parameters)})"
            if return_type:
                signature += f": {return_type}"
            lines.append(f"{class_name} : {signature}")

    lines.append("")

    # =========================================================
    # Inheritance
    # =========================================================
    for class_name, element in classes.items():
        super_types = element.attrib.get("eSuperTypes", "")
        for super_type in super_types.split():
            parent = ecore_type(super_type)
            if parent in classes:
                lines.append(f"{parent} <|-- {class_name}")

    # Add Inheritance for Custom Extension Concepts
    if custom_concepts:
        for concept in custom_concepts:
            c_name = str(concept.get("name") or "").strip().replace(" ", "")
            connects_to = str(concept.get("connects_to") or "AssumptionElement").strip().replace(" ", "")
            if c_name and connects_to:
                lines.append(f"{connects_to} <|-- {c_name}")

    lines.append("")

    # =========================================================
    # References
    # =========================================================
    for class_name, element in classes.items():
        for child in element:
            child_type = local_type(child.attrib.get(XSI_TYPE))
            if child_type != "EReference":
                continue
            ref_name = child.attrib.get("name")
            if not ref_name:
                continue
            target = ecore_type(child.attrib.get("eType"))
            if not target:
                continue
            if target not in classes and target not in enums and target not in datatypes:
                continue

            containment = child.attrib.get("containment") == "true"
            operator = "*--" if containment else "--"
            lower = child.attrib.get("lowerBound")
            upper = child.attrib.get("upperBound")
            target_multiplicity = multiplicity(lower, upper)
            source_multiplicity = "1"

            lines.append(
                f'{class_name} "{source_multiplicity}" '
                f'{operator} '
                f'"{target_multiplicity}" '
                f'{target} : {ref_name}'
            )

    lines.append("")
    lines.append("@enduml")

    return "\n".join(lines)

if __name__ == "__main__":
    path = Path(__file__).parent / "metamodel" / "foreact.ecore"
    print(ecore_to_plantuml(path))