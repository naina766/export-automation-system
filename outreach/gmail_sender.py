import sys
from pathlib import Path
BACKEND_DIR = Path(__file__).resolve().parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from backend.outreach.gmail_sender import EmailSender, DEFAULT_SUBJECT, DEFAULT_BODY
