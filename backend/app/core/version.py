"""AiutoX core platform version.

Business modules distributed as external packages (installed via pip/entry_points,
see ``ModuleInterface.get_required_core_version``) declare which core version range
they are compatible with. This constant is the single source of truth the module
registry checks external plugins against at load time.
"""

CORE_VERSION = "0.1.80"
