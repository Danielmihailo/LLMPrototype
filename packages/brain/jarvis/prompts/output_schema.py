from pydantic import BaseModel, Field
from typing import Any


class JarvisAction(BaseModel):
    connector: str
    operation: str
    payload: dict[str, Any] = Field(default_factory=dict)


class JarvisOutput(BaseModel):
    response_text: str
    actions: list[JarvisAction] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1, default=0.8)


def parse_output(raw: str) -> JarvisOutput:
    import json
    import re

    text = raw.strip()
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        text = match.group(0)
    data = json.loads(text)
    return JarvisOutput.model_validate(data)
