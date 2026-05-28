"""STT/TTS placeholders — whisper.cpp / Piper integration points."""

def transcribe_audio(_data: bytes) -> str:
    return ""


def synthesize_speech(_text: str) -> bytes:
    return b""
