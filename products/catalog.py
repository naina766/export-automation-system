import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from backend.products.catalog import ProductCatalog, slugify

__all__ = ["ProductCatalog", "slugify"]
