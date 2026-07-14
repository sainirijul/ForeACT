from __future__ import annotations

from functools import lru_cache
from pathlib import Path

METAMODEL_PATH = Path(__file__).resolve().parents[1] / "metamodel" / "foreact.ecore"


@lru_cache(maxsize=1)
def load_foreact_package():
    """Load the ForeACT Ecore package once and cache it.

    The project uses this .ecore file as the single source of truth for the
    ForeACT metamodel. All UI metamodel graphs and backend compiled model
    metadata are projected from this file.
    """
    try:
        from pyecore.resources import ResourceSet, URI
    except ImportError as exc:
        raise RuntimeError("PyEcore is required. Run `poetry install` after updating pyproject.toml.") from exc

    resource_set = ResourceSet()
    resource = resource_set.get_resource(URI(str(METAMODEL_PATH)))
    package = resource.contents[0]
    resource_set.metamodel_registry[package.nsURI] = package
    return package


def clear_metamodel_cache() -> None:
    load_foreact_package.cache_clear()
