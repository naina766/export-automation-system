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
    def get_attachment_path(file_path: Optional[str] = None) -> Optional[Path]:
        """
        Safely resolves catalog PDF path strictly within approved catalog assets directories.
        Rejects absolute paths, directory traversal ('..'), symlink escapes, and non-PDF files.
        """
        if not file_path:
            return COMPANY_PRESENTATION_PDF if (COMPANY_PRESENTATION_PDF.exists() and COMPANY_PRESENTATION_PDF.is_file()) else None
        
        clean_path_str = str(file_path).strip()
        p = Path(clean_path_str)
        
        # 1. Reject absolute paths
        if p.is_absolute():
            return None
        
        # 2. Reject directory traversal
        normalized_parts = clean_path_str.replace("\\", "/").split("/")
        if ".." in normalized_parts or "." in normalized_parts[:-1]:
            return None
        
        # 3. Reject non-PDF extensions
        if p.suffix.lower() != ".pdf":
            return None
        
        # 4. Approved root directories
        backend_dir = Path(__file__).resolve().parent.parent
        project_root = backend_dir.parent
        approved_roots = [
            (project_root / "assets").resolve(),
            (backend_dir / "assets").resolve()
        ]
        
        for root in approved_roots:
            try:
                candidate = (root / p.name if not p.parent or p.parent == Path(".") else root / p).resolve()
                if candidate.is_relative_to(root) and candidate.exists() and candidate.is_file():
                    return candidate
            except (ValueError, Exception):
                continue
                
        return COMPANY_PRESENTATION_PDF if (COMPANY_PRESENTATION_PDF.exists() and COMPANY_PRESENTATION_PDF.is_file()) else None

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
