"""Custom exceptions for Pub-Sub module."""


class PubSubError(Exception):
    """Base exception for Pub-Sub errors."""


class StreamNotFoundError(PubSubError):
    """Raised when a stream is not found."""


class GroupNotFoundError(PubSubError):
    """Raised when a consumer group is not found."""


class PublishError(PubSubError):
    """Raised when event publication fails."""


class ConsumeError(PubSubError):
    """Raised when event consumption fails."""
