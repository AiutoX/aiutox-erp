"""Edge guards for free-text input that is bound into SQL parameters.

PostgreSQL refuses ``\\x00`` in ``text`` and ``jsonb`` values
(``UntranslatableCharacter`` / "A string literal cannot contain NUL"), and
the driver raises before the statement runs. Left unchecked, a NUL byte in a
label, a change reason or a search term therefore surfaces as a ``500``
instead of a validation error (phase 230 audit of core-catalogs-foundation,
SEC-230-02). These helpers reject every C0/C1 control character at the API
edge so the failure is a ``422`` and no query is attempted.

The same guard refuses the text-spoofing format characters (SEC-230-R1-01):
bidi embeddings, overrides and isolates, the byte-order mark and the
zero-width space. They are category ``Cf``, so ``Cc`` alone lets them in, and
they let a label read differently from what it stores ("Trojan Source" style).
Joiners (U+200C, U+200D) and the LRM/RLM marks are real text and stay legal.

AiutoX ERP Core -- Frankpach
"""

import unicodedata

_LINE_BREAKS = frozenset("\n\r\t")

# U+202A-202E bidi embeddings and overrides, U+2066-2069 bidi isolates,
# U+FEFF byte-order mark, U+200B zero-width space.
_SPOOFING_FORMAT_CHARS = frozenset(
    [
        *map(chr, range(0x202A, 0x202F)),
        *map(chr, range(0x2066, 0x206A)),
        "﻿",
        "​",
    ]
)


def has_control_chars(value: str, *, allow_line_breaks: bool = False) -> bool:
    """True if ``value`` holds a Unicode ``Cc`` or a text-spoofing format char.

    With ``allow_line_breaks`` the newline, carriage return and tab stay
    legal (free-text fields); every other control, NUL included, is still
    reported.
    """
    for char in value:
        if char in _SPOOFING_FORMAT_CHARS:
            return True
        if unicodedata.category(char) != "Cc":
            continue
        if allow_line_breaks and char in _LINE_BREAKS:
            continue
        return True
    return False


def reject_control_chars(value: str, *, allow_line_breaks: bool = False) -> str:
    """Pydantic ``AfterValidator`` body: raise ``ValueError`` on a control char."""
    if has_control_chars(value, allow_line_breaks=allow_line_breaks):
        raise ValueError("must not contain control characters")
    return value


def reject_control_chars_in_text(value: str) -> str:
    """``reject_control_chars`` for multi-line free text (reasons, notes)."""
    return reject_control_chars(value, allow_line_breaks=True)
