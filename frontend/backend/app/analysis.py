from __future__ import annotations

import ast
import io
from dataclasses import asdict
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

from .domain import AnalysisScope, MethodSpec, build_default_field_specs, build_metamodel, method_catalog


def make_demo_energy_data(n_horizons: int = 36, seed: int = 14) -> pd.DataFrame:
    """Synthetic AI data-center load forecast case study in long forecast-version format.

    Each forecast_cycle provides forecast values for the same future forecast_periods.
    This lets the tool align two forecast versions over a user-selected period and compute
    meaningful variance and volatility for the same target horizon.
    """
    rng = np.random.default_rng(seed)
    cycles = pd.to_datetime(["2026-03-01", "2026-06-01", "2026-09-01", "2026-12-01"])
    horizons = pd.date_range("2027-01-01", periods=n_horizons, freq="MS")
    rows: list[dict[str, Any]] = []

    for c_idx, cycle in enumerate(cycles):
        for h_idx, horizon in enumerate(horizons):
            months_ahead = (horizon.year - cycle.year) * 12 + (horizon.month - cycle.month)
            t = h_idx
            seasonal = np.sin((h_idx - 2) * 2 * np.pi / 12)
            data_center_committed_mw = 120 + 4.2 * t + 22 * c_idx + rng.normal(0, 5)
            grid_connection_probability_pct = np.clip(48 + 1.0 * t + 6.5 * c_idx + 9 * np.sin(t * 2 * np.pi / 14) + rng.normal(0, 3.5), 25, 96)
            power_price_index = 103 + 0.16 * t + 1.5 * c_idx + 5 * np.sin(t * 2 * np.pi / 18) + rng.normal(0, 1.1)
            avg_temperature_c = 8 + 13 * seasonal + rng.normal(0, 1.0)
            cooling_efficiency_pue = 1.32 - 0.003 * c_idx + 0.018 * max(0, avg_temperature_c - 20) + rng.normal(0, 0.01)
            renewable_availability_pct = np.clip(28 + 0.4 * t + 4.5 * np.sin((t + 2) * 2 * np.pi / 12) + rng.normal(0, 2), 10, 70)
            industrial_growth_index = 100 + 0.12 * t + 0.5 * c_idx + rng.normal(0, 0.4)

            base_load = 71000 + 230 * t + 3800 * seasonal
            effective_dc_load = data_center_committed_mw * 720 * (grid_connection_probability_pct / 100) * cooling_efficiency_pue
            price_effect = -48 * power_price_index
            industrial_effect = 120 * industrial_growth_index
            weather_effect = 210 * max(0, avg_temperature_c - 18) + 120 * max(0, 5 - avg_temperature_c)
            uncertainty_premium = np.where(h_idx >= 12, 850 * c_idx, 260 * c_idx)

            total_load_mwh_forecast = base_load + effective_dc_load + price_effect + industrial_effect + weather_effect + uncertainty_premium + rng.normal(0, 1450)
            peak_load_mw_forecast = total_load_mwh_forecast / 720 * 1.39 + 0.38 * data_center_committed_mw + 1.5 * max(0, avg_temperature_c - 22) + rng.normal(0, 6)
            scenario = "accelerated_ai_load" if grid_connection_probability_pct > 72 else "uncertain_connection"

            rows.append({
                "forecast_cycle": cycle.strftime("%Y-%m"),
                "forecast_period": horizon.strftime("%Y-%m"),
                "months_ahead": int(months_ahead),
                "scenario": scenario,
                "feature_1_data_center_committed_mw": round(float(data_center_committed_mw), 2),
                "feature_2_grid_connection_probability_pct": round(float(grid_connection_probability_pct), 2),
                "feature_3_power_price_index": round(float(power_price_index), 2),
                "feature_4_avg_temperature_c": round(float(avg_temperature_c), 2),
                "feature_5_cooling_efficiency_pue": round(float(cooling_efficiency_pue), 3),
                "feature_6_industrial_growth_index": round(float(industrial_growth_index), 2),
                "feature_7_renewable_availability_pct": round(float(renewable_availability_pct), 2),
                "target_1_total_load_mwh": round(float(total_load_mwh_forecast), 2),
                "target_2_peak_load_mw": round(float(peak_load_mw_forecast), 2),
            })
    return pd.DataFrame(rows)


def read_csv_file(file_storage) -> pd.DataFrame:
    return pd.read_csv(io.BytesIO(file_storage.read()))


def _to_period_str(value: Any) -> str:
    if pd.isna(value):
        return ""
    s = str(value)
    try:
        return pd.to_datetime(s).strftime("%Y-%m")
    except Exception:
        return s[:7]


def dataset_profile(df: pd.DataFrame) -> dict[str, Any]:
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    default_specs = build_default_field_specs(df.columns.tolist(), numeric_cols)
    preview = df.head(10).replace({np.nan: None}).to_dict(orient="records")
    quality = []
    for col in df.columns:
        quality.append({
            "name": col,
            "data_type": "numeric" if col in numeric_cols else "text",
            "missing_pct": round(float(df[col].isna().mean() * 100), 2),
            "distinct_values": int(df[col].nunique(dropna=True)),
        })

    role_map = {f["role"]: f["name"] for f in default_specs if f.get("include_in_model")}
    version_field = role_map.get("forecast_version")
    horizon_field = role_map.get("forecast_horizon")
    forecast_versions: list[str] = []
    period_min = ""
    period_max = ""
    if version_field and version_field in df.columns:
        forecast_versions = sorted({_to_period_str(v) for v in df[version_field].dropna().unique()})
    if horizon_field and horizon_field in df.columns:
        periods = sorted({_to_period_str(v) for v in df[horizon_field].dropna().unique()})
        if periods:
            period_min, period_max = periods[0], periods[-1]

    default_scope = asdict(AnalysisScope())
    if default_scope.get("grouping_fields") is None:
        default_scope["grouping_fields"] = []
    if version_field:
        default_scope["version_field"] = version_field
    if horizon_field:
        default_scope["horizon_field"] = horizon_field
    if len(forecast_versions) >= 2:
        default_scope["baseline_version"] = forecast_versions[-2]
        default_scope["current_version"] = forecast_versions[-1]
    if period_min:
        default_scope["period_start"] = period_min
        default_scope["period_end"] = period_max

    return {
        "rows": int(len(df)),
        "columns": int(len(df.columns)),
        "column_names": df.columns.tolist(),
        "numeric_columns": numeric_cols,
        "forecast_versions": forecast_versions,
        "period_min": period_min,
        "period_max": period_max,
        "default_scope": default_scope,
        "default_field_specs": default_specs,
        "method_catalog": method_catalog(),
        "preview": preview,
        "quality": quality,
    }


def _field_names(field_specs: list[dict[str, Any]], role: str) -> list[str]:
    return [f["name"] for f in field_specs if f.get("role") == role and f.get("include_in_model", True)]


def _method_spec(raw: dict[str, Any] | None) -> dict[str, Any]:
    base = asdict(MethodSpec())
    if raw:
        for key in base:
            if key in raw and raw[key] is not None:
                base[key] = raw[key]
    base["rolling_window"] = max(2, int(base.get("rolling_window") or 4))
    for threshold in ["variance_threshold_large", "variance_threshold_moderate", "volatility_threshold_high", "volatility_threshold_medium"]:
        base[threshold] = float(base[threshold])
    return base


def _scope_spec(raw: dict[str, Any] | None, profile: dict[str, Any]) -> dict[str, Any]:
    base = dict(profile.get("default_scope") or asdict(AnalysisScope()))
    if raw:
        for key, value in raw.items():
            if value is not None:
                base[key] = value
    if not base.get("grouping_fields"):
        base["grouping_fields"] = []
    return base


def _classify_variance(value: float, method_spec: dict[str, Any]) -> str:
    abs_value = abs(value)
    if abs_value >= method_spec["variance_threshold_large"]:
        return "Large"
    if abs_value >= method_spec["variance_threshold_moderate"]:
        return "Moderate"
    return "Small"


def _classify_volatility(value: float, method_spec: dict[str, Any]) -> str:
    if value >= method_spec["volatility_threshold_high"]:
        return "High"
    if value >= method_spec["volatility_threshold_medium"]:
        return "Medium"
    return "Low"


def _recommend(variance_class: str, volatility_class: str) -> tuple[str, str]:
    if variance_class == "Large" and volatility_class == "Low":
        return "Act / review strategy", "The forecast movement is large and the surrounding volatility is low, so the change looks decision-relevant."
    if variance_class == "Large" and volatility_class in {"Medium", "High"}:
        return "Monitor closely", "The movement is large, but uncertainty is elevated; avoid immediate irreversible action."
    if variance_class == "Moderate" and volatility_class == "Low":
        return "Prepare options", "The signal is meaningful and relatively stable; prepare planning options."
    if volatility_class == "High":
        return "Watch uncertainty", "Volatility dominates the signal; continue monitoring and request additional evidence."
    return "Stable / no action", "Movement is small and volatility is controlled."

_ALLOWED_AST = (ast.Expression, ast.BinOp, ast.UnaryOp, ast.Num, ast.Constant, ast.Name, ast.Load, ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow, ast.Mod, ast.USub, ast.Call)
_ALLOWED_FUNCS = {"abs": np.abs, "sqrt": np.sqrt, "log": np.log, "mean": np.mean, "std": np.std}


def _safe_eval_formula(formula: str, env: dict[str, Any]) -> Any:
    if not formula.strip():
        raise ValueError("Custom formula is empty.")
    tree = ast.parse(formula, mode="eval")
    for node in ast.walk(tree):
        if not isinstance(node, _ALLOWED_AST):
            raise ValueError(f"Unsupported expression element: {type(node).__name__}")
        if isinstance(node, ast.Call) and not isinstance(node.func, ast.Name):
            raise ValueError("Only simple function calls are allowed.")
        if isinstance(node, ast.Call) and node.func.id not in _ALLOWED_FUNCS:
            raise ValueError(f"Unsupported function: {node.func.id}")
    return eval(compile(tree, "<custom_formula>", "eval"), {"__builtins__": {}, **_ALLOWED_FUNCS}, env)


def _filter_scope(df: pd.DataFrame, scope: dict[str, Any]) -> pd.DataFrame:
    horizon = scope.get("horizon_field")
    version = scope.get("version_field")
    filtered = df.copy()
    if horizon in filtered.columns:
        h = filtered[horizon].map(_to_period_str)
        filtered = filtered[(h >= str(scope.get("period_start"))) & (h <= str(scope.get("period_end")))]
        filtered[horizon] = h.loc[filtered.index]
    if version in filtered.columns:
        filtered[version] = filtered[version].map(_to_period_str)
    return filtered


def _align_versions(df: pd.DataFrame, target: str, scope: dict[str, Any]) -> tuple[pd.DataFrame, list[str]]:
    warnings: list[str] = []
    version_field = scope.get("version_field")
    horizon_field = scope.get("horizon_field")
    if version_field not in df.columns or horizon_field not in df.columns:
        warnings.append("Forecast version or horizon field is missing; cannot build ForecastComparisonModel.")
        return pd.DataFrame(), warnings

    base_v = str(scope.get("baseline_version"))
    curr_v = str(scope.get("current_version"))
    base = df[df[version_field].astype(str) == base_v][[horizon_field, target]].rename(columns={target: "baseline"})
    curr = df[df[version_field].astype(str) == curr_v][[horizon_field, target]].rename(columns={target: "current"})
    aligned = pd.merge(base, curr, on=horizon_field, how="inner")
    aligned["target"] = target
    aligned["period"] = aligned[horizon_field].astype(str)
    aligned["baseline_version"] = base_v
    aligned["current_version"] = curr_v
    aligned["baseline"] = pd.to_numeric(aligned["baseline"], errors="coerce")
    aligned["current"] = pd.to_numeric(aligned["current"], errors="coerce")
    if aligned.empty:
        warnings.append(f"No aligned rows found for {target} between {base_v} and {curr_v} in the selected horizon.")
    return aligned, warnings


def _all_versions_wide(df: pd.DataFrame, target: str, scope: dict[str, Any]) -> pd.DataFrame:
    version_field = scope.get("version_field")
    horizon_field = scope.get("horizon_field")
    if version_field not in df.columns or horizon_field not in df.columns:
        return pd.DataFrame()
    wide = df.pivot_table(index=horizon_field, columns=version_field, values=target, aggfunc="mean")
    return wide.sort_index()


def _driver_volatility(df: pd.DataFrame, feature_cols: list[str]) -> pd.Series:
    vols = []
    for col in feature_cols:
        if col not in df.columns:
            continue
        s = pd.to_numeric(df[col], errors="coerce")
        # Use horizon ordered instability over the selected analysis period.
        denom = s.mean() if abs(float(s.mean() or 0)) > 1e-9 else np.nan
        vols.append(float(s.std() / denom * 100) if denom == denom else 0.0)
    return pd.Series(vols) if vols else pd.Series([0.0])


def _compute_signals(aligned: pd.DataFrame, all_versions: pd.DataFrame, filtered_df: pd.DataFrame, target: str, feature_cols: list[str], method_spec: dict[str, Any]) -> tuple[pd.Series, pd.Series, str, str, list[str]]:
    warnings: list[str] = []
    baseline = aligned["baseline"]
    current = aligned["current"]
    method_v = method_spec["variance_method"]
    method_vol = method_spec["volatility_method"]

    if method_v == "version_to_version_pct":
        variance = ((current - baseline) / baseline.replace(0, np.nan)) * 100
        variance_basis = "current forecast version vs baseline forecast version over selected horizon"
    elif method_v == "version_delta_abs":
        variance = current - baseline
        variance_basis = "absolute current-minus-baseline forecast delta over selected horizon"
    elif method_v == "custom":
        env = {"baseline": baseline, "current": current, "all_versions_mean": all_versions.mean(axis=1).reindex(aligned["period"]).reset_index(drop=True), "all_versions_std": all_versions.std(axis=1).reindex(aligned["period"]).reset_index(drop=True)}
        variance = pd.Series(_safe_eval_formula(str(method_spec.get("custom_variance_formula", "")), env), index=aligned.index)
        variance_basis = "custom variance formula"
    else:
        hist_mean = current.mean()
        variance = ((current - hist_mean) / hist_mean) * 100
        variance_basis = "fallback latest vs selected-period mean"
        warnings.append(f"Variance method {method_v} does not use forecast versions; fallback used for {target}.")

    if method_vol == "version_dispersion_pct" and not all_versions.empty:
        subset = all_versions.reindex(aligned["period"].tolist())
        mean = subset.mean(axis=1).replace(0, np.nan)
        vol_values = (subset.std(axis=1) / mean * 100).reset_index(drop=True)
        volatility = pd.Series(vol_values.values, index=aligned.index)
        volatility_basis = "dispersion across all available forecast versions for each horizon"
    elif method_vol == "revision_instability_pct" and not all_versions.empty:
        revisions = all_versions.pct_change(axis=1) * 100
        volatility = revisions.std(axis=1).reindex(aligned["period"]).reset_index(drop=True)
        volatility = pd.Series(volatility.values, index=aligned.index)
        volatility_basis = "standard deviation of consecutive forecast revisions across versions"
    elif method_vol == "driver_instability_index":
        driver_score = float(_driver_volatility(filtered_df, feature_cols).mean())
        volatility = pd.Series([driver_score] * len(aligned), index=aligned.index)
        volatility_basis = "mean driver instability over selected analysis period"
    elif method_vol == "custom":
        driver_score = float(_driver_volatility(filtered_df, feature_cols).mean())
        env = {
            "baseline": baseline,
            "current": current,
            "all_versions_mean": all_versions.mean(axis=1).reindex(aligned["period"]).reset_index(drop=True),
            "all_versions_std": all_versions.std(axis=1).reindex(aligned["period"]).reset_index(drop=True),
            "driver_volatility": pd.Series([driver_score] * len(aligned), index=aligned.index),
        }
        volatility = pd.Series(_safe_eval_formula(str(method_spec.get("custom_volatility_formula", "")), env), index=aligned.index)
        volatility_basis = "custom volatility formula"
    else:
        volatility = abs(variance).rolling(window=method_spec["rolling_window"], min_periods=2).std().fillna(0)
        volatility_basis = "fallback rolling standard deviation of variance"
        warnings.append(f"Volatility method {method_vol} could not be applied; fallback used for {target}.")
    return variance, volatility, variance_basis, volatility_basis, warnings


def _top_driver_links(df: pd.DataFrame, target: str, feature_cols: list[str]) -> list[dict[str, Any]]:
    links = []
    if target not in df.columns:
        return links
    y = pd.to_numeric(df[target], errors="coerce")
    for feature in feature_cols:
        if feature not in df.columns:
            continue
        x = pd.to_numeric(df[feature], errors="coerce")
        corr = x.corr(y) if x.notna().sum() > 2 and y.notna().sum() > 2 else np.nan
        links.append({"feature": feature, "correlation": None if pd.isna(corr) else round(float(corr), 3), "absolute_strength": None if pd.isna(corr) else round(abs(float(corr)), 3)})
    return sorted(links, key=lambda d: d["absolute_strength"] or 0, reverse=True)[:4]


def _model_fit_summary(df: pd.DataFrame, feature_cols: list[str], target_cols: list[str]) -> list[dict[str, Any]]:
    summaries: list[dict[str, Any]] = []
    if len(df) < 20 or not feature_cols or not target_cols:
        return summaries
    X = df[feature_cols].replace([np.inf, -np.inf], np.nan).fillna(df[feature_cols].median(numeric_only=True)).fillna(0)
    for target in target_cols:
        y = pd.to_numeric(df[target], errors="coerce")
        valid = y.notna()
        if valid.sum() < 20:
            continue
        X_valid, y_valid = X.loc[valid], y.loc[valid]
        X_train, X_test, y_train, y_test = train_test_split(X_valid, y_valid, test_size=0.25, random_state=42, shuffle=False)
        candidates = {"LinearRegression": LinearRegression(), "RandomForestRegressor": RandomForestRegressor(n_estimators=80, random_state=42, min_samples_leaf=3)}
        best = None
        for name, model in candidates.items():
            model.fit(X_train, y_train)
            preds = model.predict(X_test)
            mae = float(mean_absolute_error(y_test, preds))
            item = {"target": target, "model": name, "features_used": feature_cols, "train_rows": int(len(X_train)), "test_rows": int(len(X_test)), "mae": round(mae, 3), "rmse": round(float(mean_squared_error(y_test, preds) ** 0.5), 3), "r2": round(float(r2_score(y_test, preds)), 3)}
            if best is None or item["mae"] < best["mae"]:
                best = item
        if best:
            summaries.append(best)
    return summaries


def _conformance(field_specs: list[dict[str, Any]], method_spec: dict[str, Any], scope: dict[str, Any], target_results: list[dict[str, Any]], decision_cards: list[dict[str, Any]], warnings: list[str], custom_concepts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    targets = _field_names(field_specs, "target")
    results: list[dict[str, Any]] = []
    aligned_ok = not any("No aligned rows" in w or "missing" in w for w in warnings)
    results.append({"rule_id": "CR-001", "status": "pass" if aligned_ok else "fail", "severity": "error", "message": "Forecast versions are aligned over the selected horizon." if aligned_ok else "Forecast version alignment is incomplete. " + "; ".join(warnings[:2])})
    missing_targets = sorted(set(targets) - {r["target"] for r in target_results})
    results.append({"rule_id": "CR-002", "status": "pass" if not missing_targets else "fail", "severity": "error", "message": "All selected targets produce variance and volatility signals." if not missing_targets else f"Missing target signals for: {', '.join(missing_targets)}"})
    incomplete = [f["name"] for f in field_specs if f.get("include_in_model") and f.get("role") in {"target", "feature", "forecast_version", "forecast_horizon"} and (not f.get("business_name") or not f.get("semantic_type") or (f.get("role") == "target" and not f.get("unit")))]
    results.append({"rule_id": "CR-003", "status": "pass" if not incomplete else "warning", "severity": "warning", "message": "Decision-relevant field metadata is complete." if not incomplete else f"Review metadata for: {', '.join(incomplete[:8])}"})
    methods_ok = bool(method_spec.get("variance_method")) and bool(method_spec.get("volatility_method"))
    results.append({"rule_id": "CR-004", "status": "pass" if methods_ok else "fail", "severity": "error", "message": "Variance and volatility methods are explicitly declared." if methods_ok else "Declare both variance and volatility methods before analysis."})
    trace_ok = bool(decision_cards) and all("ForecastComparisonModel" in c.get("trace", {}) for c in decision_cards)
    results.append({"rule_id": "CR-005", "status": "pass" if trace_ok else "fail", "severity": "error", "message": "Decision cards trace through the transformation chain." if trace_ok else "Decision card trace is incomplete."})
    invalid_custom = [c for c in custom_concepts if not c.get("name") or not c.get("description") or not c.get("connects_to")]
    results.append({"rule_id": "CR-006", "status": "pass" if not invalid_custom else "warning", "severity": "warning", "message": "Custom metamodel concepts are well-formed." if not invalid_custom else "Some custom concepts need name, description, and connection."})
    return results


def analyze_dataframe(df: pd.DataFrame, field_specs: list[dict[str, Any]] | None = None, methods: dict[str, Any] | None = None, scope: dict[str, Any] | None = None, custom_concepts: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    profile = dataset_profile(df)
    field_specs = field_specs or profile["default_field_specs"]
    method_spec = _method_spec(methods)
    scope_spec = _scope_spec(scope, profile)
    custom_concepts = custom_concepts or []
    target_cols = _field_names(field_specs, "target")
    feature_cols = _field_names(field_specs, "feature")
    warnings: list[str] = []

    filtered = _filter_scope(df, scope_spec)
    target_results: list[dict[str, Any]] = []
    matrix_points: list[dict[str, Any]] = []
    decision_cards: list[dict[str, Any]] = []
    aligned_preview: list[dict[str, Any]] = []

    for target in target_cols:
        if target not in filtered.columns:
            warnings.append(f"Target {target} is not present in filtered data.")
            continue
        aligned, align_warnings = _align_versions(filtered, target, scope_spec)
        warnings.extend(align_warnings)
        if aligned.empty:
            continue
        all_versions = _all_versions_wide(filtered, target, scope_spec)
        variance, volatility, variance_basis, volatility_basis, signal_warnings = _compute_signals(aligned, all_versions, filtered, target, feature_cols, method_spec)
        warnings.extend(signal_warnings)
        aligned["variance_pct"] = variance.replace([np.inf, -np.inf], np.nan)
        aligned["volatility"] = volatility.replace([np.inf, -np.inf], np.nan)
        aligned_preview.extend(aligned[["period", "target", "baseline_version", "current_version", "baseline", "current", "variance_pct", "volatility"]].head(8).replace({np.nan: None}).to_dict(orient="records"))

        latest_variance = float(aligned["variance_pct"].dropna().iloc[-1]) if aligned["variance_pct"].notna().any() else 0.0
        mean_abs_variance = float(aligned["variance_pct"].abs().mean()) if aligned["variance_pct"].notna().any() else 0.0
        volatility_score = float(aligned["volatility"].mean()) if aligned["volatility"].notna().any() else 0.0
        variance_class = _classify_variance(latest_variance, method_spec)
        volatility_class = _classify_volatility(volatility_score, method_spec)
        action, rationale = _recommend(variance_class, volatility_class)
        confidence = "High" if volatility_class == "Low" and variance_class in {"Large", "Moderate"} else "Medium" if volatility_class == "Medium" else "Low" if volatility_class == "High" else "Medium"
        series = [{"period": row["period"], "baseline": None if pd.isna(row["baseline"]) else round(float(row["baseline"]), 3), "current": None if pd.isna(row["current"]) else round(float(row["current"]), 3), "variance_pct": None if pd.isna(row["variance_pct"]) else round(float(row["variance_pct"]), 3), "volatility": None if pd.isna(row["volatility"]) else round(float(row["volatility"]), 3)} for _, row in aligned.iterrows()]
        links = _top_driver_links(filtered, target, feature_cols)

        result = {
            "target": target,
            "variance_basis": variance_basis,
            "volatility_basis": volatility_basis,
            "mean_abs_variance_pct": round(mean_abs_variance, 3),
            "latest_variance_pct": round(latest_variance, 3),
            "volatility_score": round(volatility_score, 3),
            "variance_class": variance_class,
            "volatility_class": volatility_class,
            "confidence": confidence,
            "recommended_action": action,
            "rationale": rationale,
            "top_driver_links": links,
            "series": series,
        }
        target_results.append(result)
        matrix_points.append({"target": target, "x_variance_abs_pct": round(abs(latest_variance), 3), "y_volatility_score": round(volatility_score, 3), "variance_class": variance_class, "volatility_class": volatility_class, "recommended_action": action})
        decision_cards.append({
            "target": target,
            "headline": f"{action} for {target}",
            "rationale": rationale,
            "trace": {
                "DatasetVersion": f"{len(df)} rows / {len(df.columns)} columns",
                "FieldModel": f"{len(feature_cols)} drivers, {len(target_cols)} targets",
                "AnalysisScope": f"{scope_spec.get('baseline_version')} → {scope_spec.get('current_version')}, {scope_spec.get('period_start')} to {scope_spec.get('period_end')}",
                "MethodSet": f"{method_spec['variance_method']} + {method_spec['volatility_method']}",
                "ForecastComparisonModel": f"{len(aligned)} aligned horizon rows",
                "SignalModel": f"variance={latest_variance:.2f}, volatility={volatility_score:.2f}",
            },
        })

    transformations = [
        {"id": "T1", "name": "ProfileToFieldModel", "input": "DatasetVersion", "output": "FieldModel", "purpose": "Convert raw CSV columns into typed, editable semantic fields.", "status": "pass"},
        {"id": "T2", "name": "ScopeBindingAndVersionAlignment", "input": "FieldModel + AnalysisScope", "output": "ForecastComparisonModel", "purpose": "Join baseline and current forecast versions for the same forecast horizon and targets.", "status": "pass" if aligned_preview else "warning"},
        {"id": "T3", "name": "MethodSetToSignalModel", "input": "ForecastComparisonModel + MethodSet", "output": "VarianceSignal + VolatilitySignal", "purpose": "Apply declared variance and volatility methods rather than hidden calculations.", "status": "pass" if target_results else "warning"},
        {"id": "T4", "name": "SignalModelToDecisionCard", "input": "VarianceSignal + VolatilitySignal + Thresholds", "output": "DecisionModel", "purpose": "Transform classified signals into traceable actionability recommendations.", "status": "pass" if decision_cards else "warning"},
    ]

    return {
        "dataset_profile": {**profile, "field_specs": field_specs, "selected_methods": method_spec, "selected_scope": scope_spec},
        "metamodel": build_metamodel(field_specs, method_spec, scope_spec, custom_concepts),
        "transformations": transformations,
        "forecast_comparison_preview": aligned_preview[:20],
        "model_fit_summary": _model_fit_summary(filtered, feature_cols, target_cols),
        "target_results": target_results,
        "matrix_points": matrix_points,
        "decision_cards": decision_cards,
        "conformance_results": _conformance(field_specs, method_spec, scope_spec, target_results, decision_cards, warnings, custom_concepts),
        "warnings": warnings,
    }
