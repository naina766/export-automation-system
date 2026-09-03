"""
Attachment Management Module.
Validates and prepares company presentation attachment for email dispatch.
"""
from pathlib import Path
from typing import Optional, Tuple
from email.mime.base import MIMEBase
from email import encoders
from config import COMPANY_PRESENTATION_PDF

class AttachmentHandler:
    """Handles attachment validation and MIME packaging."""

    @staticmethod
    def get_presentation_status() -> Tuple[bool, str, int]:
        """
        Check if company presentation PDF is available.
        Returns: (exists, file_name, file_size_bytes)
        """
        if COMPANY_PRESENTATION_PDF.exists() and COMPANY_PRESENTATION_PDF.is_file():
            size = COMPANY_PRESENTATION_PDF.stat().st_size
            return True, COMPANY_PRESENTATION_PDF.name, size
        return False, "company_presentation.pdf (Missing)", 0

    @classmethod
    def create_mime_attachment(cls) -> Optional[MIMEBase]:
        """Create MIME attachment part for email if file exists."""
        exists, _, _ = cls.get_presentation_status()
        if not exists:
            return None

        try:
            with open(COMPANY_PRESENTATION_PDF, "rb") as f:
                part = MIMEBase("application", "pdf")
                part.set_payload(f.read())
            encoders.encode_base64(part)
            part.add_header(
                "Content-Disposition",
                f'attachment; filename="{COMPANY_PRESENTATION_PDF.name}"'
            )
            return part
        except Exception as e:
            print(f"Error reading presentation attachment: {e}")
            return None
