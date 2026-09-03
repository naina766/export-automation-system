import sys
from pathlib import Path
BACKEND_DIR = Path(__file__).resolve().parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from backend.logging_module.activity_logger import ActivityLogger, SENT_LOG_COLUMNS
