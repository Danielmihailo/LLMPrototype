"""Mock inference backend — rule-based JARVIS for dev without GGUF."""
from __future__ import annotations

import json
import re

from jarvis.prompts.output_schema import JarvisAction, JarvisOutput


def _act(connector: str, operation: str, payload: dict | None = None) -> JarvisAction:
    return JarvisAction(
        connector=connector,
        operation=operation,
        payload=payload or {},
    )


INTENT_PATTERNS: list[tuple[re.Pattern[str], JarvisOutput]] = [
    (
        re.compile(r"tausch|swap|ersetz", re.I),
        JarvisOutput(
            response_text="Ich tausche die Produkte nach deiner Bestätigung.",
            actions=[
                _act("shopify", "swap_products", {"from_product_id": "FROM", "to_product_id": "TO"})
            ],
            confidence=0.85,
        ),
    ),
    (
        re.compile(r"seite|page|landing", re.I),
        JarvisOutput(
            response_text="Ich erstelle eine neue Seite im Shop.",
            actions=[
                _act("shopify", "create_page", {"title": "Neue Seite", "body": "<p>Generiert von JARVIS</p>"})
            ],
            confidence=0.9,
        ),
    ),
    (
        re.compile(r"preis|price", re.I),
        JarvisOutput(
            response_text="Preisupdate vorbereitet.",
            actions=[
                _act("shopify", "update_price", {"variant_id": "gid://shopify/ProductVariant/1", "price": "29.99"})
            ],
            confidence=0.88,
        ),
    ),
    (
        re.compile(r"produkt|list|zeig", re.I),
        JarvisOutput(
            response_text="Hier sind deine Produkte.",
            actions=[_act("shopify", "list_products")],
            confidence=0.92,
        ),
    ),
    (
        re.compile(r"live.?chat|chat.?kunden", re.I),
        JarvisOutput(
            response_text="Ich richte den Live-Chat für deine Kunden ein.",
            actions=[_act("greenfield", "setup_live_chat")],
            confidence=0.87,
        ),
    ),
    (
        re.compile(r"shop.*(generier|erstell)|komplett.*shop", re.I),
        JarvisOutput(
            response_text="Ich generiere einen kompletten Shop von A bis Z.",
            actions=[
                _act(
                    "greenfield",
                    "generate_shop",
                    {"name": "JARVIS Shop", "products": [], "pages": [{"title": "Home"}]},
                )
            ],
            confidence=0.8,
        ),
    ),
    (
        re.compile(r"lieferant|supplier", re.I),
        JarvisOutput(
            response_text="Lieferanten-Integration wird vorbereitet.",
            actions=[_act("greenfield", "integrate_supplier", {"supplier_name": "default"})],
            confidence=0.75,
        ),
    ),
    (
        re.compile(r"verbind|connect|oauth", re.I),
        JarvisOutput(
            response_text="Gehe zu Shops → Verbinden, um deinen Store zu koppeln.",
            actions=[_act("shopify", "connect_shop_help")],
            confidence=0.95,
        ),
    ),
]


class MockBackend:
    name = "mock"
    model = "jarvis-mock-v1"

    def infer(self, messages: list[dict[str, str]]) -> JarvisOutput:
        last = ""
        for m in reversed(messages):
            if m.get("role") in ("user", "assistant") and m.get("content"):
                last = m["content"]
                break
        for pattern, output in INTENT_PATTERNS:
            if pattern.search(last):
                return output
        return JarvisOutput(
            response_text=f"Verstanden: «{last[:120]}». Wie soll ich fortfahren?",
            actions=[],
            confidence=0.6,
        )

    def stream_infer(self, messages: list[dict[str, str]]):
        result = self.infer(messages)
        for word in result.response_text.split(" "):
            yield word + " "
        yield json.dumps(result.model_dump())
