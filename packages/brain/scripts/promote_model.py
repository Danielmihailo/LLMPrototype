#!/usr/bin/env python3
"""Model promotion CLI — activate adapter version in registry."""
from __future__ import annotations

import argparse
import json
import os

import httpx


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", required=True)
    parser.add_argument("--api", default=os.environ.get("API_URL", "http://localhost:3001"))
    args = parser.parse_args()
    # Requires authenticated session in production
    print(f"Promote model {args.version} via POST {args.api}/v1/admin/models/{args.version}/promote")
    print("(Call from authenticated admin session)")


if __name__ == "__main__":
    main()
