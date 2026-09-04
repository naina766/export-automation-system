"""
Attachment Management Module.
Validates and attaches the company presentation catalog for email campaigns.
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
        Check if company presentation PDF is available and valid.
        Returns: (exists, file_name, file_size_bytes)
        """
        if COMPANY_PRESENTATION_PDF.exists() and COMPANY_PRESENTATION_PDF.is_file():
            size = COMPANY_PRESENTATION_PDF.stat().st_size
            return True, COMPANY_PRESENTATION_PDF.name, size
        return False, "company_presentation.pdf (Missing)", 0

    @classmethod
    def get_mime_attachment(cls, file_path: Optional[Path] = None) -> Optional[MIMEBase]:
        """Create MIME attachment part for given path or default presentation PDF."""
        target = Path(file_path) if file_path else COMPANY_PRESENTATION_PDF
        if not target.exists() or not target.is_file():
            return None
        try:
            with open(target, "rb") as f:
                part = MIMEBase("application", "pdf")
                part.set_payload(f.read())
            encoders.encode_base64(part)
            part.add_header(
                "Content-Disposition",
                f'attachment; filename="{target.name}"'
            )
            return part
        except Exception as e:
            print(f"Error preparing MIME attachment: {e}")
            return None

    @classmethod
    def create_mime_attachment(cls) -> Optional[MIMEBase]:
        """Create MIME attachment part for email if file exists."""
        return cls.get_mime_attachment(COMPANY_PRESENTATION_PDF)
