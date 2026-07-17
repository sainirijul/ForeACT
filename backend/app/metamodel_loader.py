from __future__ import annotations

from functools import lru_cache
from pathlib import Path

METAMODEL_PATH = Path(__file__).resolve().parents[1] / "metamodel" / "foreact.ecore"

@lru_cache(maxsize=4)
def _load_foreact_package_for_mtime(modified_ns: int):
    try:
        from pyecore.resources import ResourceSet, URI
    except ImportError as exc:
        raise RuntimeError("PyEcore is required. Run `poetry install`.") from exc
    resource_set = ResourceSet()
    resource = resource_set.get_resource(URI(str(METAMODEL_PATH)))
    package = resource.contents[0]
    resource_set.metamodel_registry[package.nsURI] = package
    return package

def load_foreact_package():
    """Load the current Ecore package, automatically invalidating on file changes."""
    return _load_foreact_package_for_mtime(METAMODEL_PATH.stat().st_mtime_ns)

def clear_metamodel_cache() -> None:
    _load_foreact_package_for_mtime.cache_clear()
