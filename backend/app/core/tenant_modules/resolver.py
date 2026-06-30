"""Dependency resolver for module installation planning."""

from dataclasses import dataclass, field

from packaging.specifiers import InvalidSpecifier, SpecifierSet

from app.core.module_registry import get_module_registry


class CircularDependencyError(Exception):
    """Raised when a circular dependency is detected."""

    pass


class UnresolvableConflictError(Exception):
    """Raised when dependencies cannot be satisfied."""

    pass


@dataclass
class ModuleDependency:
    """Represents a dependency requirement."""

    module: str
    version_range: str = ">=1.0.0"  # Semantic version range

    def matches_version(self, version: str) -> bool:
        """Check if a version satisfies the range.

        Args:
            version: Version string (e.g., "1.2.3")

        Returns:
            True if version is in the range, False otherwise
        """
        try:
            spec = SpecifierSet(self.version_range)
            return version in spec
        except InvalidSpecifier:
            # If range is invalid, accept any version
            return True


@dataclass
class InstallPlan:
    """Plan for installing a module with its dependencies."""

    target_module: str
    target_version: str
    target_tier: str
    install_order: list[str] = field(default_factory=list)
    modules: dict[str, ModuleDependency] = field(default_factory=dict)

    def add_module(self, module: str, version: str = "1.0.0") -> None:
        """Add a module to the install plan.

        Args:
            module: Module ID
            version: Version string
        """
        if module not in self.modules:
            self.modules[module] = ModuleDependency(module, f">={version}")

    def __repr__(self) -> str:
        return f"<InstallPlan(target={self.target_module}, order={self.install_order})>"


class DependencyResolver:
    """Resolves transitive dependencies for module installation."""

    def __init__(self):
        """Initialize resolver with module registry."""
        self.registry = get_module_registry()

    def resolve_install_plan(
        self,
        target_module: str,
        target_version: str = "1.0.0",
        target_tier: str = "basic",
    ) -> InstallPlan:
        """Resolve installation plan with transitive dependencies.

        Args:
            target_module: Module to install
            target_version: Version to install
            target_tier: Tier level (basic|pro|enterprise)

        Returns:
            InstallPlan with topologically sorted install order

        Raises:
            CircularDependencyError: If circular dependencies detected
            UnresolvableConflictError: If dependencies cannot be satisfied
        """
        plan = InstallPlan(target_module, target_version, target_tier)

        # 1. Add the target module itself then resolve transitive hard dependencies
        plan.add_module(target_module)
        self._resolve_transitive_deps(target_module, plan, visited=set())

        # 2. Topologically sort
        try:
            plan.install_order = self._topological_sort(plan.modules)
        except CircularDependencyError as e:
            raise UnresolvableConflictError(
                f"Cannot resolve dependencies for {target_module}: {e}"
            ) from e

        return plan

    def _resolve_transitive_deps(
        self, module_id: str, plan: InstallPlan, visited: set[str]
    ) -> None:
        """Recursively resolve transitive dependencies.

        Args:
            module_id: Current module to resolve
            plan: InstallPlan accumulator
            visited: Set of already-visited modules (for cycle detection)

        Raises:
            CircularDependencyError: If cycle detected
        """
        if module_id in visited:
            raise CircularDependencyError(f"Circular dependency involving {module_id}")

        visited.add(module_id)

        # Get module from registry
        module = self.registry.get_module(module_id)
        if not module:
            # Module may not be in registry yet (valid in install flow)
            return

        # Resolve hard dependencies from module interface
        for dep_id in module.get_dependencies():
            plan.add_module(dep_id)
            self._resolve_transitive_deps(dep_id, plan, visited.copy())

    def _topological_sort(self, modules: dict[str, ModuleDependency]) -> list[str]:
        """Topologically sort modules by dependencies.

        Uses Kahn's algorithm with cycle detection.

        Args:
            modules: Dict mapping module_id to ModuleDependency

        Returns:
            List of module IDs in install order

        Raises:
            CircularDependencyError: If cycle detected
        """
        # Build in-degree map
        in_degree: dict[str, int] = {m: 0 for m in modules.keys()}
        graph: dict[str, list[str]] = {m: [] for m in modules.keys()}

        # Populate graph from dependencies
        for module_id, dep in modules.items():
            module = self.registry.get_module(module_id)
            if module:
                for dep_id in module.get_dependencies():
                    if dep_id in modules:
                        graph[dep_id].append(module_id)
                        in_degree[module_id] += 1

        # Kahn's algorithm
        queue = [m for m in modules.keys() if in_degree[m] == 0]
        result = []

        while queue:
            queue.sort()  # Deterministic order
            current = queue.pop(0)
            result.append(current)

            for neighbor in graph[current]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        # Detect cycles
        if len(result) != len(modules):
            remaining = [m for m in modules.keys() if in_degree[m] > 0]
            raise CircularDependencyError(f"Modules with unresolved deps: {remaining}")

        return result
