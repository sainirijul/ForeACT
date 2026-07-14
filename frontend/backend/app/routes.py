from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd
from flask import Blueprint, jsonify, request

from .analysis import analyze_dataframe, dataset_profile, make_demo_energy_data, read_csv_file
from .domain import method_catalog
from .metamodel_projection import ecore_to_graph

api = Blueprint("api", __name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
WORKSPACE_DIR = PROJECT_ROOT / "backend" / "workspaces"
UPLOAD_DIR = WORKSPACE_DIR / "uploads"
DEFAULT_WORKSPACE_ID = "ai_datacenter_capacity"
DEFAULT_WORKSPACE_FILE = WORKSPACE_DIR / f"{DEFAULT_WORKSPACE_ID}.foreact.json"
DEFAULT_DATASET_PATH = PROJECT_ROOT / "data" / "use_cases" / "ai_datacenter_load_forecast.csv"

WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _slug(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9_\-]+", "_", value)
    return value.strip("_") or DEFAULT_WORKSPACE_ID


def _json_form(name: str, default: Any):
    raw = request.form.get(name)
    if not raw:
        return default
    return json.loads(raw)


def _read_workspace(workspace_id: str = DEFAULT_WORKSPACE_ID) -> dict[str, Any]:
    path = WORKSPACE_DIR / f"{_slug(workspace_id)}.foreact.json"
    if not path.exists():
        path = DEFAULT_WORKSPACE_FILE
    return json.loads(path.read_text(encoding="utf-8"))


def _write_workspace(spec: dict[str, Any], workspace_id: str | None = None) -> Path:
    project = spec.setdefault("project", {})
    resolved_id = _slug(workspace_id or project.get("id") or DEFAULT_WORKSPACE_ID)
    project["id"] = resolved_id
    project["tool_name"] = "ForeACT"
    project["central_file"] = f"backend/workspaces/{resolved_id}.foreact.json"
    spec.setdefault("metadata", {})["updated_at"] = datetime.utcnow().isoformat(timespec="seconds") + "Z"
    path = WORKSPACE_DIR / f"{resolved_id}.foreact.json"
    path.write_text(json.dumps(spec, indent=2), encoding="utf-8")
    return path


def _dataset_path(spec: dict[str, Any]) -> Path:
    raw = spec.get("dataset", {}).get("path") or str(DEFAULT_DATASET_PATH.relative_to(PROJECT_ROOT))
    candidate = Path(raw)
    if not candidate.is_absolute():
        candidate = PROJECT_ROOT / candidate
    if not candidate.exists():
        candidate = DEFAULT_DATASET_PATH
    return candidate


def _read_dataset_for_spec(spec: dict[str, Any]) -> pd.DataFrame:
    path = _dataset_path(spec)
    return pd.read_csv(path)


def _profile_for_spec(spec: dict[str, Any]) -> dict[str, Any]:
    df = _read_dataset_for_spec(spec)
    profile = dataset_profile(df)
    stored_fields = spec.get("field_model", {}).get("fields")
    if stored_fields:
        profile["default_field_specs"] = stored_fields
    stored_scope = spec.get("methodology_model", {}).get("scope")
    if stored_scope:
        profile["default_scope"] = stored_scope
    return profile


def _analysis_from_spec(spec: dict[str, Any]) -> dict[str, Any]:
    df = _read_dataset_for_spec(spec)
    field_specs = spec.get("field_model", {}).get("fields")
    methods = spec.get("methodology_model", {}).get("methods")
    scope = spec.get("methodology_model", {}).get("scope")
    concepts = spec.get("metamodel_extension", {}).get("concepts", [])
    analysis = analyze_dataframe(df, field_specs, methods, scope, concepts)
    spec["compiled_model"] = {
        "metamodel": analysis.get("metamodel"),
        "transformations": analysis.get("transformations"),
        "forecast_comparison_preview": analysis.get("forecast_comparison_preview"),
    }
    spec["analysis_cache"] = {
        "matrix_points": analysis.get("matrix_points"),
        "decision_cards": analysis.get("decision_cards"),
        "conformance_results": analysis.get("conformance_results"),
    }
    analysis["project_spec"] = spec
    return analysis


@api.get("/health")
def health():
    return jsonify({"status": "ok", "service": "foreact-backend", "workspace_dir": str(WORKSPACE_DIR)})


@api.get("/method-catalog")
def methods():
    return jsonify(method_catalog())


@api.get("/metamodel")
def metamodel():
    # The core metamodel is independent of the workspace file.
    # Keeping this endpoint workspace-free avoids a blank canvas when the
    # workspace id and workspace filename differ during early prototyping.
    return jsonify(ecore_to_graph([]))


@api.get("/workspace/default")
def workspace_default():
    spec = _read_workspace(DEFAULT_WORKSPACE_ID)
    return jsonify({"spec": spec, "profile": _profile_for_spec(spec), "workspace_file": spec.get("project", {}).get("central_file"), "metamodel": ecore_to_graph(spec.get("metamodel_extension", {}).get("concepts", []))})


@api.get("/workspace/<workspace_id>")
def workspace_get(workspace_id: str):
    spec = _read_workspace(workspace_id)
    return jsonify({"spec": spec, "profile": _profile_for_spec(spec), "workspace_file": spec.get("project", {}).get("central_file"), "metamodel": ecore_to_graph(spec.get("metamodel_extension", {}).get("concepts", []))})


@api.post("/workspace/save")
def workspace_save():
    payload = request.get_json(silent=True) or {}
    spec = payload.get("spec") or payload
    path = _write_workspace(spec, payload.get("workspace_id"))
    return jsonify({"status": "saved", "workspace_file": str(path.relative_to(PROJECT_ROOT)), "spec": spec})


@api.post("/workspace/analyze")
def workspace_analyze():
    payload = request.get_json(silent=True) or {}
    spec = payload.get("spec") or _read_workspace(payload.get("workspace_id", DEFAULT_WORKSPACE_ID))
    analysis = _analysis_from_spec(spec)
    path = _write_workspace(spec, spec.get("project", {}).get("id"))
    analysis["workspace_file"] = str(path.relative_to(PROJECT_ROOT))
    return jsonify(analysis)


@api.post("/workspace/upload-data")
def workspace_upload_data():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded. Use multipart/form-data with a 'file' field."}), 400
    file = request.files["file"]
    if not file.filename.lower().endswith(".csv"):
        return jsonify({"error": "Only CSV files are supported."}), 400
    spec = json.loads(request.form.get("spec", "{}")) or _read_workspace(DEFAULT_WORKSPACE_ID)
    workspace_id = _slug(spec.get("project", {}).get("id") or DEFAULT_WORKSPACE_ID)
    filename = f"{workspace_id}_{_slug(Path(file.filename).stem)}.csv"
    upload_path = UPLOAD_DIR / filename
    file.save(upload_path)
    rel = str(upload_path.relative_to(PROJECT_ROOT)).replace("\\", "/")
    spec.setdefault("dataset", {})["path"] = rel
    spec["dataset"]["source_type"] = "uploaded_csv"
    profile = _profile_for_spec(spec)
    spec.setdefault("field_model", {})["fields"] = profile["default_field_specs"]
    spec.setdefault("methodology_model", {})["scope"] = profile["default_scope"]
    path = _write_workspace(spec, workspace_id)
    return jsonify({"status": "uploaded", "workspace_file": str(path.relative_to(PROJECT_ROOT)), "spec": spec, "profile": profile})


# Backward-compatible endpoints from the earlier scaffold.
@api.get("/demo-data")
def demo_data():
    if DEFAULT_DATASET_PATH.exists():
        df = pd.read_csv(DEFAULT_DATASET_PATH)
    else:
        df = make_demo_energy_data()
    return jsonify({"rows": df.to_dict(orient="records"), "columns": df.columns.tolist()})


@api.post("/profile-demo")
def profile_demo():
    if DEFAULT_DATASET_PATH.exists():
        return jsonify(dataset_profile(pd.read_csv(DEFAULT_DATASET_PATH)))
    return jsonify(dataset_profile(make_demo_energy_data()))


@api.post("/profile-upload")
def profile_upload():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded. Use multipart/form-data with a 'file' field."}), 400
    file = request.files["file"]
    if not file.filename.lower().endswith(".csv"):
        return jsonify({"error": "Only CSV files are supported."}), 400
    return jsonify(dataset_profile(read_csv_file(file)))


@api.post("/analyze-demo")
def analyze_demo():
    df = pd.read_csv(DEFAULT_DATASET_PATH) if DEFAULT_DATASET_PATH.exists() else make_demo_energy_data()
    payload = request.get_json(silent=True) or {}
    return jsonify(analyze_dataframe(df, payload.get("field_specs"), payload.get("methods"), payload.get("scope"), payload.get("custom_concepts")))


@api.post("/upload")
def upload():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded. Use multipart/form-data with a 'file' field."}), 400
    file = request.files["file"]
    if not file.filename.lower().endswith(".csv"):
        return jsonify({"error": "Only CSV files are supported."}), 400
    df = read_csv_file(file)
    field_specs = _json_form("field_specs", None)
    methods = _json_form("methods", None)
    scope = _json_form("scope", None)
    custom_concepts = _json_form("custom_concepts", [])
    return jsonify(analyze_dataframe(df, field_specs, methods, scope, custom_concepts))
