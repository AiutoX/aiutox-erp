"""HTTP helpers for serving stored files."""

import re
from urllib.parse import quote

# Anything outside printable ASCII, plus characters that would break out of a
# quoted-string header parameter or be misread by clients (" \ ; % /).
_UNSAFE_FALLBACK_CHARS = re.compile(r'[^\x20-\x7e]|["\\;%/]')


def content_disposition(filename: str, disposition: str = "attachment") -> str:
    """Build a safe ``Content-Disposition`` header value for a user filename.

    Same approach as Starlette's ``FileResponse`` (RFC 6266 / RFC 5987), which
    only applies to on-disk paths: a plain quoted ``filename`` when the name is
    safe ASCII; otherwise an ASCII fallback plus a percent-encoded UTF-8
    ``filename*`` that modern browsers prefer. The result is always
    latin-1-encodable and never contains raw quotes or CR/LF, so arbitrary
    uploaded filenames can neither crash the response nor inject headers.
    """
    filename = filename or "download"
    fallback = _UNSAFE_FALLBACK_CHARS.sub("_", filename)
    if fallback == filename:
        return f'{disposition}; filename="{filename}"'
    encoded = quote(filename, safe="")
    return f"{disposition}; filename=\"{fallback}\"; filename*=UTF-8''{encoded}"
