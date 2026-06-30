"""PDF exporter for import/export module.

Uses TemplateRenderer for template-based PDFs and reportlab for rendering.
"""

import io
from typing import Any
from uuid import UUID

from app.core.templates.renderer import TemplateRenderer


class PDFExporter:
    """Exports data to PDF format.

    Supports two modes:
    - Template mode: renders a TemplateRenderer template body then converts to PDF
    - Tabular mode: renders a simple table of dicts to PDF
    """

    def export_from_template(
        self,
        template_body: str,
        context: dict[str, Any],
        title: str = "Export",
    ) -> bytes:
        """Render a template with context and produce a PDF.

        Args:
            template_body: Template with {{ variable }} placeholders
            context: Variable values for substitution
            title: PDF document title

        Returns:
            PDF file content as bytes
        """
        rendered_text = TemplateRenderer.render(template_body, context)
        return self._text_to_pdf(rendered_text, title=title)

    def export(
        self,
        data: list[dict[str, Any]],
        columns: list[str] | None = None,
        title: str = "Export",
        template_id: UUID | None = None,
    ) -> bytes:
        """Export data to PDF.

        Args:
            data: List of row dicts
            columns: Column order. If None, uses keys from first row.
            title: PDF document title
            template_id: Optional template UUID (reserved for future template-based layout)

        Returns:
            PDF file content as bytes
        """
        return self.export_table(data, fieldnames=columns, title=title)

    def export_table(
        self,
        data: list[dict[str, Any]],
        fieldnames: list[str] | None = None,
        title: str = "Export",
    ) -> bytes:
        """Export tabular data to a PDF table.

        Args:
            data: List of row dicts
            fieldnames: Column order. If None, uses keys from first row.
            title: PDF document title

        Returns:
            PDF file content as bytes
        """
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import (
                Paragraph,
                SimpleDocTemplate,
                Table,
                TableStyle,
            )
        except ImportError as exc:
            raise ImportError(
                "reportlab is required for PDF export. "
                "Install it with: uv add reportlab"
            ) from exc

        if not data:
            return b""

        if fieldnames is None:
            fieldnames = list(data[0].keys())

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, title=title)
        styles = getSampleStyleSheet()
        elements = []

        # Title
        elements.append(Paragraph(title, styles["Title"]))

        # Table data: header + rows
        table_data = [fieldnames]
        for row in data:
            table_data.append([str(row.get(f, "")) for f in fieldnames])

        table = Table(table_data)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 11),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                ]
            )
        )
        elements.append(table)
        doc.build(elements)
        return buffer.getvalue()

    def _text_to_pdf(self, text: str, title: str = "Export") -> bytes:
        """Convert plain text to a simple PDF document."""
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
        except ImportError as exc:
            raise ImportError(
                "reportlab is required for PDF export. "
                "Install it with: uv add reportlab"
            ) from exc

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, title=title)
        styles = getSampleStyleSheet()
        elements = []

        elements.append(Paragraph(title, styles["Title"]))
        for line in text.split("\n"):
            if line.strip():
                elements.append(Paragraph(line, styles["Normal"]))
            else:
                elements.append(Spacer(1, 12))

        doc.build(elements)
        return buffer.getvalue()
