from pathlib import Path
import json


PERSONA_PATH = Path(__file__).parent / "jarvis_system.md"
SCHEMA_PATH = Path(__file__).resolve().parents[4] / "docs" / "action-schema.json"


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
    out.append(
        {
            "role": "user",
            "content": "Respond ONLY with valid JSON matching the output contract.",
        }
    )
    return out
