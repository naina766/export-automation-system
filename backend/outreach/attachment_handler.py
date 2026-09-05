"""
Attachment Management Module.
Validates and attaches the company presentation catalog for email campaigns.
"""
from pathlib import Path
from typing import Optional, Tuple
from email.mime.base import MIMEBase
from email import encoders
from backend.config import COMPANY_PRESENTATION_PDF

class AttachmentHandler:
    """Handles attachment validation and MIME packaging."""

    @staticmethod
    def get_attachment_path(file_path: Optional[str] = None) -> Optional[Path]:
        """
        Safely resolves catalog PDF path strictly within approved catalog assets directories.
        Rejects absolute paths outside assets, directory traversal ('..'), symlink escapes, and non-PDF files.
        If file_path is specified but cannot be resolved or is invalid, returns None (does not silently substitute).
        If file_path is None, returns default company presentation PDF if available.
        """
        backend_dir = Path(__file__).resolve().parent.parent
        project_root = backend_dir.parent
        approved_roots = [
            (project_root / "assets").resolve(),
            (backend_dir / "assets").resolve()
        ]

        if not file_path:
            for root in approved_roots:
                default_cand = (root / "company_presentation.pdf").resolve()
                if default_cand.exists() and default_cand.is_file() and default_cand.stat().st_size > 0:
                    return default_cand
            return None
        
        clean_path_str = str(file_path).strip()
        p = Path(clean_path_str)
        
        # 1. Reject directory traversal attempts
        normalized_parts = clean_path_str.replace("\\", "/").split("/")
        if ".." in normalized_parts:
            return None
        
        # 2. Reject non-PDF extensions
        if p.suffix.lower() != ".pdf":
            return None
        
        # 3. Check if absolute path is within approved roots
        if p.is_absolute():
            resolved_p = p.resolve()
            for root in approved_roots:
                try:
                    if resolved_p.is_relative_to(root) and resolved_p.exists() and resolved_p.is_file() and resolved_p.stat().st_size > 0:
                        return resolved_p
                except (ValueError, Exception):
                    continue
            return None
        
        # 4. Relative path resolution within approved roots
        # Check: root / p.name (e.g. assets / tibetan_singing_bowls_catalog.pdf)
        # Check: project_root / p (e.g. project_root / assets/tibetan_singing_bowls_catalog.pdf)
        for root in approved_roots:
            candidates = [
                (root / p.name).resolve(),
                (project_root / p).resolve(),
                (backend_dir / p).resolve()
            ]
            for cand in candidates:
                try:
                    if any(cand.is_relative_to(r) for r in approved_roots):
                        if cand.exists() and cand.is_file() and cand.stat().st_size > 0:
                            return cand
                except (ValueError, Exception):
                    continue
                
        return None

    @staticmethod
    def get_presentation_status(file_path: Optional[str] = None) -> Tuple[bool, str, int]:
        """
        Check if catalog PDF is available and valid.
        Returns: (exists, file_name, file_size_bytes)
        """
        att_path = AttachmentHandler.get_attachment_path(file_path)
        if att_path and att_path.exists() and att_path.is_file():
            size = att_path.stat().st_size
            return True, att_path.name, size
        filename = Path(file_path).name if file_path else "company_presentation.pdf"
        return False, f"{filename} (Missing/Unavailable)", 0

    @classmethod
    def get_mime_attachment(cls, file_path: Optional[Any] = None) -> Optional[MIMEBase]:
        """Create MIME attachment part for given path or default presentation PDF."""
        resolved = cls.get_attachment_path(str(file_path) if file_path else None)
        if not resolved or not resolved.exists() or not resolved.is_file():
            return None
        try:
            with open(resolved, "rb") as f:
                content = f.read()
            if not content:
                return None
            part = MIMEBase("application", "pdf")
            part.set_payload(content)
            encoders.encode_base64(part)
            part.add_header(
                "Content-Disposition",
                f'attachment; filename="{resolved.name}"'
            )
            return part
        except Exception as e:
            print(f"Error preparing MIME attachment: {e}")
            return None

    @classmethod
    def create_mime_attachment(cls, file_path: Optional[str] = None) -> Optional[MIMEBase]:
        """Create MIME attachment part for email if file exists."""
        return cls.get_mime_attachment(file_path)

