"""Template renderer for variable substitution."""

import re
from typing import Any


class TemplateRenderer:
    """Renderer for templates with variable substitution.

    Supports simple variable substitution with {{ variable_name }} syntax.
    No logic or conditionals supported (kept simple per Phase 4 requirements).
    """

    @staticmethod
    def render(template_body: str, context: dict[str, Any]) -> str:
        """Render a template with the given context.

        Args:
            template_body: Template string with {{ variable_name }} placeholders
            context: Dictionary of variable names to values

        Returns:
            Rendered template string

        Raises:
            ValueError: If a required variable is missing from context
        """
        # Find all {{ variable_name }} patterns
        pattern = r"\{\{\s*(\w+)\s*\}\}"

        def replace_var(match: re.Match[str]) -> str:
            var_name = match.group(1)
            if var_name not in context:
                raise ValueError(f"Missing required template variable: '{var_name}'")
            value = context[var_name]
            return str(value)

        return re.sub(pattern, replace_var, template_body)

    @staticmethod
    def extract_variables(template_body: str) -> list[str]:
        """Extract all variable names from a template.

        Args:
            template_body: Template string with {{ variable_name }} placeholders

        Returns:
            List of variable names found in the template
        """
        pattern = r"\{\{\s*(\w+)\s*\}\}"
        matches = re.findall(pattern, template_body)
        return list(set(matches))  # Return unique variables
