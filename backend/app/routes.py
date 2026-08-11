from __future__ import annotations

import json
import re
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
from flask import Blueprint, jsonify, request

from .analysis import (
    analyze_dataframe,
    dataset_profile,
    make_demo_energy_data,
    read_csv_file,
)
from .domain import method_catalog
from .conformance import validate_project_spec_against_metamodel
from .metamodel_editor import (
    add_attribute,
    add_class,
    add_reference,
    delete_attribute,
    delete_class,
)
from .metamodel_projection import ecore_to_graph
import time

api = Blueprint("api", __name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
WORKSPACE_DIR = PROJECT_ROOT / "backend" / "workspaces"
UPLOAD_DIR = WORKSPACE_DIR / "uploads"
DEFAULT_WORKSPACE_ID = "ai_datacenter_capacity"
DEFAULT_WORKSPACE_FILE = WORKSPACE_DIR / f"{DEFAULT_WORKSPACE_ID}.foreact.json"
DEFAULT_DATASET_PATH = (
    PROJECT_ROOT / "data" / "use_cases" / "ai_datacenter_load_forecast.csv"
)

WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _workspace_id_from_request(default: str = DEFAULT_WORKSPACE_ID) -> str:
    """
    Resolve workspace id from request form/json/query.
    Never trust the uploaded spec as the source of truth.
    """
    workspace_id = None

    if request.form:
        workspace_id = request.form.get("workspace_id")

    if not workspace_id and request.is_json:
        body = request.get_json(silent=True) or {}
        workspace_id = body.get("workspace_id")

    if not workspace_id:
        workspace_id = request.args.get("workspace_id")

    return _slug(workspace_id or default)


def _load_workspace_for_update(workspace_id: str | None = None) -> tuple[str, dict]:
    """
    Always load the current workspace from disk before making changes.
    """
    resolved_id = _slug(workspace_id or DEFAULT_WORKSPACE_ID)
    spec = _read_workspace(resolved_id)

    spec.setdefault("project", {})
    spec["project"]["id"] = _slug(spec["project"].get("id") or resolved_id)

    return spec["project"]["id"], spec


def _save_workspace_and_profile(spec: dict, workspace_id: str | None = None) -> dict:
    """
    Write the workspace JSON and return a consistent response payload.
    """
    resolved_id = _slug(
        workspace_id or spec.get("project", {}).get("id") or DEFAULT_WORKSPACE_ID
    )

    spec.setdefault("project", {})
    spec["project"]["id"] = resolved_id
    spec["project"]["updated_at"] = _utc_now_iso()

    path = _write_workspace(spec, resolved_id)
    profile = _profile_for_spec(spec)

    return {
        "workspace_id": resolved_id,
        "workspace_file": str(path.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "spec": spec,
        "profile": profile,
    }


def _reset_dataset_dependent_state(
    spec: dict[str, Any],
    profile: dict[str, Any],
) -> dict[str, Any]:
    next_spec = deepcopy(spec)

    inferred_fields = deepcopy(profile.get("default_field_specs", []))

    inferred_scope = deepcopy(profile.get("default_scope", {}))

    next_spec.setdefault(
        "field_model",
        {},
    )["fields"] = inferred_fields

    methodology = next_spec.setdefault(
        "methodology_model",
        {},
    )

    methodology["scope"] = inferred_scope

    current_methods = methodology.get("methods")

    if not current_methods:
        methodology["methods"] = deepcopy(
            profile.get(
                "selected_methods",
                {},
            )
        )

    dataset = next_spec.setdefault(
        "dataset",
        {},
    )

    dataset["version_field"] = inferred_scope.get("version_field", "")

    dataset["horizon_field"] = inferred_scope.get("horizon_field", "")

    # These were derived from the previous dataset.
    next_spec["compiled_model"] = {}
    next_spec["analysis_cache"] = {}

    metadata = next_spec.setdefault(
        "metadata",
        {},
    )

    metadata["dataset_updated_at"] = datetime.now(timezone.utc).isoformat()

    metadata["dataset_rows"] = profile.get(
        "rows",
        0,
    )

    metadata["dataset_columns"] = profile.get(
        "columns",
        0,
    )

    return next_spec


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
    spec.setdefault("metadata", {})["updated_at"] = (
        datetime.utcnow().isoformat(timespec="seconds") + "Z"
    )
    path = WORKSPACE_DIR / f"{resolved_id}.foreact.json"
    path.write_text(json.dumps(spec, indent=2), encoding="utf-8")
    return path


def _ensure_demo_dataset() -> Path:

    DEFAULT_DATASET_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    if not DEFAULT_DATASET_PATH.exists():
        demo_df = make_demo_energy_data()
        demo_df.to_csv(
            DEFAULT_DATASET_PATH,
            index=False,
        )

    return DEFAULT_DATASET_PATH


def _dataset_path(spec: dict[str, Any]) -> Path:
    raw_path = spec.get("dataset", {}).get("path")

    if raw_path:
        candidate = Path(raw_path)

        if not candidate.is_absolute():
            candidate = PROJECT_ROOT / candidate

        if candidate.exists() and candidate.is_file():
            return candidate

    return _ensure_demo_dataset()


def _read_dataset_for_spec(
    spec: dict[str, Any],
) -> pd.DataFrame:
    path = _dataset_path(spec)

    try:
        return pd.read_csv(path)
    except UnicodeDecodeError as exc:
        raise ValueError(
            f"Dataset '{path.name}' is not a UTF-8-compatible CSV."
        ) from exc
    except pd.errors.EmptyDataError as exc:
        raise ValueError(f"Dataset '{path.name}' does not contain data.") from exc
    except pd.errors.ParserError as exc:
        raise ValueError(f"Dataset '{path.name}' could not be parsed as CSV.") from exc


def _profile_for_spec(
    spec: dict[str, Any],
    *,
    use_stored_model: bool = True,
) -> dict[str, Any]:
    df = _read_dataset_for_spec(spec)
    profile = dataset_profile(df)

    if use_stored_model:
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
    policy_rules = spec.get("decision_policy", {}).get("rules", [])
    analysis = analyze_dataframe(
        df, field_specs, methods, scope, concepts, policy_rules
    )
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
    return jsonify(
        {
            "status": "ok",
            "service": "foreact-backend",
            "workspace_dir": str(WORKSPACE_DIR),
        }
    )


@api.get("/method-catalog")
def methods():
    return jsonify(method_catalog())


@api.get("/workspace/default")
def workspace_default():
    workspace_id = _slug(request.args.get("workspace_id") or DEFAULT_WORKSPACE_ID)
    workspace_id, spec = _load_workspace_for_update(workspace_id)
    payload = _save_workspace_and_profile(spec, workspace_id)

    try:
        metamodel = ecore_to_graph()
    except Exception:
        metamodel = None

    return jsonify(
        {
            "status": "ok",
            **payload,
            "metamodel": metamodel,
        }
    )


@api.get("/workspace/<workspace_id>")
def workspace_get(workspace_id: str):
    spec = _read_workspace(workspace_id)
    return jsonify(
        {
            "spec": spec,
            "profile": _profile_for_spec(spec),
            "workspace_file": spec.get("project", {}).get("central_file"),
            "metamodel": ecore_to_graph(
                spec.get("metamodel_extension", {}).get("concepts", [])
            ),
        }
    )


@api.post("/workspace/save")
def workspace_save():
    """
    Save user edits to the active workspace JSON.
    This should be used for semantic field edits, methodology settings,
    thresholds, and business rationale.
    """
    body = request.get_json(force=True) or {}

    workspace_id = _slug(
        body.get("workspace_id")
        or body.get("spec", {}).get("project", {}).get("id")
        or DEFAULT_WORKSPACE_ID
    )

    _, current_spec = _load_workspace_for_update(workspace_id)
    incoming_spec = body.get("spec") or {}

    if not incoming_spec:
        return jsonify({"error": "Missing spec in request body."}), 400

    # Preserve canonical project id.
    incoming_spec.setdefault("project", {})
    incoming_spec["project"]["id"] = workspace_id

    # Keep dataset path unless explicitly changed.
    if "dataset" not in incoming_spec:
        incoming_spec["dataset"] = current_spec.get("dataset", {})

    payload = _save_workspace_and_profile(incoming_spec, workspace_id)

    return jsonify(
        {
            "status": "saved",
            **payload,
        }
    )


@api.post("/workspace/analyze")
def workspace_analyze():
    """
    Analyze exactly the project specification currently shown in the UI.

    The submitted specification is persisted before the response is
    returned, making the workspace JSON the durable source of truth.
    """

    payload = request.get_json(silent=True) or {}

    submitted_spec = payload.get("spec")

    workspace_id = _slug(
        payload.get("workspace_id")
        or (submitted_spec and submitted_spec.get("project", {}).get("id"))
        or DEFAULT_WORKSPACE_ID
    )

    spec = deepcopy(submitted_spec or _read_workspace(workspace_id))

    spec.setdefault(
        "project",
        {},
    )["id"] = workspace_id

    try:
        analysis = _analysis_from_spec(spec)
    except (
        KeyError,
        ValueError,
        TypeError,
        pd.errors.ParserError,
    ) as exc:
        return (
            jsonify(
                {
                    "error": ("Analysis configuration is invalid: " f"{exc}"),
                }
            ),
            400,
        )

    validate_start = time.perf_counter()
    compiled_ecore_model, ecore_results = validate_project_spec_against_metamodel(spec)
    validate_end = time.perf_counter()
    print(f"Validation time: {validate_end - validate_start}")
    analysis["compiled_ecore_model"] = compiled_ecore_model
    analysis["conformance_results"] = ecore_results + analysis.get(
        "conformance_results", []
    )
    spec["compiled_model"] = compiled_ecore_model

    saved = _save_workspace_and_profile(
        spec,
        workspace_id,
    )

    analysis.update(
        {
            "project_spec": saved["spec"],
            "profile": saved["profile"],
            "workspace_file": saved["workspace_file"],
            "workspace_id": saved["workspace_id"],
        }
    )

    return jsonify(analysis)


@api.post("/workspace/upload-data")
def workspace_upload_data():
    workspace_id = _slug(request.form.get("workspace_id") or DEFAULT_WORKSPACE_ID)

    uploaded_file = request.files.get("file")

    if uploaded_file is None:
        return (
            jsonify(
                {
                    "error": "No CSV file was provided.",
                }
            ),
            400,
        )

    original_name = uploaded_file.filename or ""

    if not original_name.strip():
        return (
            jsonify(
                {
                    "error": "The uploaded file does not have a filename.",
                }
            ),
            400,
        )

    if not original_name.lower().endswith(".csv"):
        return (
            jsonify(
                {
                    "error": "ForeACT currently accepts CSV files only.",
                }
            ),
            400,
        )

    safe_name = _slug(Path(original_name).stem)

    upload_dir = WORKSPACE_DIR / "uploads"
    upload_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    timestamp = datetime.now(
        timezone.utc,
    ).strftime("%Y%m%dT%H%M%SZ")

    upload_path = upload_dir / f"{workspace_id}_{safe_name}_{timestamp}.csv"

    uploaded_file.save(upload_path)

    try:
        uploaded_df = pd.read_csv(upload_path)
    except (
        UnicodeDecodeError,
        pd.errors.EmptyDataError,
        pd.errors.ParserError,
    ) as exc:
        upload_path.unlink(missing_ok=True)

        return (
            jsonify(
                {
                    "error": ("The uploaded CSV could not be parsed: " f"{exc}"),
                }
            ),
            400,
        )

    if uploaded_df.empty:
        upload_path.unlink(missing_ok=True)

        return (
            jsonify(
                {
                    "error": ("The uploaded CSV must contain at least one row."),
                }
            ),
            400,
        )

    if len(uploaded_df.columns) < 2:
        upload_path.unlink(missing_ok=True)

        return (
            jsonify(
                {
                    "error": ("The uploaded CSV must contain at least two columns."),
                }
            ),
            400,
        )

    if uploaded_df.columns.duplicated().any():
        upload_path.unlink(missing_ok=True)

        duplicated = uploaded_df.columns[uploaded_df.columns.duplicated()].tolist()

        return (
            jsonify(
                {
                    "error": (
                        "The uploaded CSV contains duplicate column names: "
                        + ", ".join(map(str, duplicated))
                    ),
                }
            ),
            400,
        )

    try:
        spec = deepcopy(_read_workspace(workspace_id))
    except FileNotFoundError:
        spec = deepcopy(_read_workspace(DEFAULT_WORKSPACE_ID))

    relative_path = str(upload_path.relative_to(PROJECT_ROOT)).replace("\\", "/")

    spec.setdefault(
        "project",
        {},
    )["id"] = workspace_id

    spec["dataset"] = {
        **spec.get("dataset", {}),
        "id": f"{workspace_id}_dataset",
        "source_type": "uploaded_csv",
        "path": relative_path,
        "format": "csv",
        "description": (f"User-uploaded dataset: {original_name}"),
    }

    profile = _profile_for_spec(
        spec,
        use_stored_model=False,
    )

    spec = _reset_dataset_dependent_state(
        spec,
        profile,
    )

    saved = _save_workspace_and_profile(
        spec,
        workspace_id,
    )

    return jsonify(
        {
            **saved,
            "status": "uploaded",
        }
    )


# Backward-compatible endpoints from the earlier scaffold.
@api.get("/demo-data")
def demo_data():
    if DEFAULT_DATASET_PATH.exists():
        df = pd.read_csv(DEFAULT_DATASET_PATH)
    else:
        df = make_demo_energy_data()
    return jsonify(
        {"rows": df.to_dict(orient="records"), "columns": df.columns.tolist()}
    )


@api.post("/profile-demo")
def profile_demo():
    if DEFAULT_DATASET_PATH.exists():
        return jsonify(dataset_profile(pd.read_csv(DEFAULT_DATASET_PATH)))
    return jsonify(dataset_profile(make_demo_energy_data()))


@api.post("/profile-upload")
def profile_upload():
    if "file" not in request.files:
        return (
            jsonify(
                {
                    "error": "No file uploaded. Use multipart/form-data with a 'file' field."
                }
            ),
            400,
        )
    file = request.files["file"]
    if not file.filename.lower().endswith(".csv"):
        return jsonify({"error": "Only CSV files are supported."}), 400
    return jsonify(dataset_profile(read_csv_file(file)))


@api.post("/analyze-demo")
def analyze_demo():
    df = (
        pd.read_csv(DEFAULT_DATASET_PATH)
        if DEFAULT_DATASET_PATH.exists()
        else make_demo_energy_data()
    )
    payload = request.get_json(silent=True) or {}
    return jsonify(
        analyze_dataframe(
            df,
            payload.get("field_specs"),
            payload.get("methods"),
            payload.get("scope"),
            payload.get("custom_concepts"),
            payload.get("policy_rules", []),
        )
    )


@api.post("/upload")
def upload():
    if "file" not in request.files:
        return (
            jsonify(
                {
                    "error": "No file uploaded. Use multipart/form-data with a 'file' field."
                }
            ),
            400,
        )
    file = request.files["file"]
    if not file.filename.lower().endswith(".csv"):
        return jsonify({"error": "Only CSV files are supported."}), 400
    df = read_csv_file(file)
    field_specs = _json_form("field_specs", None)
    methods = _json_form("methods", None)
    scope = _json_form("scope", None)
    custom_concepts = _json_form("custom_concepts", [])
    policy_rules = _json_form("policy_rules", [])
    return jsonify(
        analyze_dataframe(
            df, field_specs, methods, scope, custom_concepts, policy_rules
        )
    )


@api.get("/metamodel")
def get_metamodel():
    workspace_id = request.args.get(
        "workspace_id",
        DEFAULT_WORKSPACE_ID,
    )

    runtime_summary = None

    try:
        spec = _read_workspace(workspace_id)
        runtime_summary = {
            "workspace_id": workspace_id,
            "field_count": len(spec.get("field_model", {}).get("fields", [])),
            "custom_concept_count": len(
                spec.get("metamodel_extension", {}).get("concepts", [])
            ),
        }
    except FileNotFoundError:
        pass

    concepts = (
        spec.get("metamodel_extension", {}).get("concepts", [])
        if runtime_summary is not None
        else []
    )
    model = ecore_to_graph(concepts)

    if runtime_summary is not None:
        model["runtime_summary"] = runtime_summary

    return jsonify(model)


@api.post("/metamodel/classes")
def create_metamodel_class():
    try:
        payload = request.get_json(force=True) or {}
        return jsonify(add_class(payload))
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 400


@api.delete("/metamodel/classes/<class_name>")
def delete_metamodel_class(class_name):
    try:
        return jsonify(delete_class(class_name))
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 400


@api.post("/metamodel/classes/<class_name>/attributes")
def create_metamodel_attribute(class_name):
    try:
        payload = request.get_json(force=True) or {}
        return jsonify(add_attribute(class_name, payload))
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 400


@api.delete("/metamodel/classes/<class_name>/attributes/<attribute_name>")
def delete_metamodel_attribute(class_name, attribute_name):
    try:
        return jsonify(delete_attribute(class_name, attribute_name))
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 400


@api.post("/metamodel/classes/<class_name>/references")
def create_metamodel_reference(class_name):
    try:
        payload = request.get_json(force=True) or {}
        return jsonify(add_reference(class_name, payload))
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 400
