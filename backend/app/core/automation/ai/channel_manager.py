from fastapi import status

from app.core.exceptions import APIException

SUPPORTED_CHANNELS = frozenset({"embedded_chat", "telegram"})


class ChannelManager:
    def validate(self, channel: str) -> None:
        if channel not in SUPPORTED_CHANNELS:
            raise APIException(
                code="AI_UNSUPPORTED_CHANNEL",
                message=f"Channel '{channel}' is not supported. Supported: {sorted(SUPPORTED_CHANNELS)}",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
