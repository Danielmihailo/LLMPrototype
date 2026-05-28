from pathlib import Path
import json


PERSONA_PATH = Path(__file__).parent / "jarvis_system.md"

# Resolve docs/action-schema.json — works in Docker (/app) and local dev (repo root)
def _find_schema() -> Path:
    here = Path(__file__).resolve()
    for parent in here.parents:
        candidate = parent / "docs" / "action-schema.json"
        if candidate.exists():
            return candidate
    return here.parents[0] / "action-schema.json"  # fallback (missing = empty schema)

SCHEMA_PATH = _find_schema()


def load_persona() -> str:
    if PERSONA_PATH.exists():
        return PERSONA_PATH.read_text(encoding="utf-8")
    return "You are JARVIS, a shop operating AI."


def load_action_schema() -> str:
    if SCHEMA_PATH.exists():
        return SCHEMA_PATH.read_text(encoding="utf-8")
    return "{}"


def build_system_prompt() -> str:
    return f"{load_persona()}\n\nAction JSON Schema:\n{load_action_schema()}"


def wrap_messages(
    messages: list[dict[str, str]],
    shop_context: dict | None = None,
    memory: list[str] | None = None,
) -> list[dict[str, str]]:
    system = build_system_prompt()
    if shop_context:
        system += f"\n\nShop context:\n{json.dumps(shop_context, ensure_ascii=False)[:4000]}"
    if memory:
        system += "\n\nMemory:\n" + "\n".join(f"- {m}" for m in memory[:20])

    out = [{"role": "system", "content": system}]
    for m in messages:
        role = m.get("role", "user")
        if role == "jarvis":
            role = "assistant"
        out.append({"role": role, "content": m.get("content", "")})

    # Ensure last message is from user (required by most LLM APIs).
    # Append the JSON instruction to the last user message, or add a new one.
    json_instruction = "Respond ONLY with valid JSON matching the output contract."
    if out and out[-1]["role"] == "user":
        out[-1]["content"] += f"\n\n{json_instruction}"
    else:
        out.append({"role": "user", "content": json_instruction})
    return out
