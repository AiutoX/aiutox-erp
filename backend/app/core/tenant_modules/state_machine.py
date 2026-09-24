"""State machine for TenantModule lifecycle."""

from dataclasses import dataclass

from app.core.tenant_modules.models import TenantModuleState


class InvalidStateTransitionError(Exception):
    """Raised when attempting an invalid state transition."""

    pass


@dataclass(frozen=True)
class StateTransition:
    """Represents a valid state transition."""

    from_state: TenantModuleState
    to_state: TenantModuleState


class TenantModuleStateMachine:
    """Validates and enforces state transitions for TenantModule lifecycle.

    Valid state transitions:
    - not_installed → installing → active
    - active ↔ disabled (reversible)
    - active → grace_period, grace_period → active (reactivate)
    - active/disabled/grace_period → grace_period → exported → uninstalled
    """

    # Define all valid transitions
    VALID_TRANSITIONS = {
        StateTransition(TenantModuleState.NOT_INSTALLED, TenantModuleState.INSTALLING),
        StateTransition(TenantModuleState.INSTALLING, TenantModuleState.ACTIVE),
        StateTransition(TenantModuleState.ACTIVE, TenantModuleState.DISABLED),
        StateTransition(TenantModuleState.DISABLED, TenantModuleState.ACTIVE),
        StateTransition(TenantModuleState.ACTIVE, TenantModuleState.GRACE_PERIOD),
        StateTransition(TenantModuleState.DISABLED, TenantModuleState.GRACE_PERIOD),
        StateTransition(TenantModuleState.GRACE_PERIOD, TenantModuleState.ACTIVE),
        StateTransition(TenantModuleState.GRACE_PERIOD, TenantModuleState.EXPORTED),
        StateTransition(TenantModuleState.EXPORTED, TenantModuleState.UNINSTALLED),
    }

    @classmethod
    def can_transition(
        cls, from_state: TenantModuleState, to_state: TenantModuleState
    ) -> bool:
        """Check if a transition is valid.

        Args:
            from_state: Current state
            to_state: Target state

        Returns:
            True if transition is allowed, False otherwise
        """
        return StateTransition(from_state, to_state) in cls.VALID_TRANSITIONS

    @classmethod
    def validate_transition(
        cls, from_state: TenantModuleState, to_state: TenantModuleState
    ) -> None:
        """Validate that a transition is allowed.

        Args:
            from_state: Current state
            to_state: Target state

        Raises:
            InvalidStateTransitionError: If transition is not allowed
        """
        if not cls.can_transition(from_state, to_state):
            raise InvalidStateTransitionError(
                f"Cannot transition from {from_state} to {to_state}"
            )

    @classmethod
    def get_allowed_transitions(
        cls, from_state: TenantModuleState
    ) -> set[TenantModuleState]:
        """Get all allowed target states from a given state.

        Args:
            from_state: Current state

        Returns:
            Set of valid target states
        """
        return {t.to_state for t in cls.VALID_TRANSITIONS if t.from_state == from_state}
