"""Generate curated Shopify + WordPress training dialogues."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_SHOPIFY = ROOT / "data" / "curated" / "shopify_dialogues.jsonl"
OUT_WP = ROOT / "data" / "curated" / "wordpress_dialogues.jsonl"

SYSTEM = "You are JARVIS. Output JSON with response_text, actions, confidence."

PRODUCTS = ["Hoodie Blue M", "Hoodie Black L", "Sneaker White 42", "Cap Red", "T-Shirt Green S"]
TITLES = ["About Us", "Shipping", "FAQ", "Kontakt", "Sale"]


def assistant(connector: str, operation: str, payload: dict, text: str) -> str:
    return json.dumps(
        {
            "response_text": text,
            "actions": [{"connector": connector, "operation": operation, "payload": payload}],
            "confidence": 0.88,
        },
        ensure_ascii=False,
    )


def gen_shopify(n: int = 55) -> list[dict]:
    rows = []
    for i in range(n):
        a, b = PRODUCTS[i % len(PRODUCTS)], PRODUCTS[(i + 1) % len(PRODUCTS)]
        title = TITLES[i % len(TITLES)]
        mode = i % 5
        if mode == 0:
            user = f"Tausche {a} gegen {b}"
            pl = {"from_product_id": a, "to_product_id": b}
            op = "swap_products"
        elif mode == 1:
            user = f"Erstelle Seite {title}"
            pl = {"title": title, "body": "<p>Content</p>"}
            op = "create_page"
        elif mode == 2:
            user = f"Setze Preis von Variante {i} auf {19 + i}.99"
            pl = {"variant_id": f"gid://shopify/ProductVariant/{i}", "price": f"{19 + i}.99"}
            op = "update_price"
        elif mode == 3:
            user = "Liste alle Produkte"
            pl = {}
            op = "list_products"
        else:
            user = "Hilf mir Shopify zu verbinden"
            pl = {}
            op = "connect_shop_help"
        rows.append(
            {
                "messages": [
                    {"role": "system", "content": SYSTEM},
                    {"role": "user", "content": user},
                    {"role": "assistant", "content": assistant("shopify", op, pl, f"Erledigt: {user}")},
                ]
            }
        )
    return rows


def gen_wp(n: int = 35) -> list[dict]:
    rows = []
    for i in range(n):
        a, b = PRODUCTS[i % len(PRODUCTS)], PRODUCTS[(i + 2) % len(PRODUCTS)]
        title = TITLES[i % len(TITLES)]
        mode = i % 4
        if mode == 0:
            user = f"Erstelle WordPress Seite {title}"
            pl = {"title": title, "body": "WP content"}
            op = "create_page"
        elif mode == 1:
            user = "Zeige WooCommerce Produkte"
            pl = {}
            op = "list_products"
        elif mode == 2:
            user = f"Ändere Preis Produkt {100 + i} auf {29 + i}.00"
            pl = {"product_id": str(100 + i), "price": f"{29 + i}.00"}
            op = "update_price"
        else:
            user = f"Tausche Produkt {a} mit {b}"
            pl = {"from_product_id": a, "to_product_id": b}
            op = "swap_products"
        rows.append(
            {
                "messages": [
                    {"role": "system", "content": SYSTEM},
                    {"role": "user", "content": user},
                    {"role": "assistant", "content": assistant("wordpress", op, pl, f"WP: {user}")},
                ]
            }
        )
    return rows


def write_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    write_jsonl(OUT_SHOPIFY, gen_shopify())
    write_jsonl(OUT_WP, gen_wp())
    print(f"Wrote {OUT_SHOPIFY} and {OUT_WP}")
