"""Merge LoRA adapter into base weights for deployment."""
from __future__ import annotations

import argparse
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--adapter", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        from peft import PeftModel
        from transformers import AutoModelForCausalLM, AutoTokenizer

        base = "Qwen/Qwen2.5-0.5B-Instruct"
        model = AutoModelForCausalLM.from_pretrained(base)
        model = PeftModel.from_pretrained(model, str(args.adapter))
        merged = model.merge_and_unload()
        args.output.mkdir(parents=True, exist_ok=True)
        merged.save_pretrained(str(args.output))
        AutoTokenizer.from_pretrained(base).save_pretrained(str(args.output))
        print(f"Merged model saved to {args.output}")
    except ImportError:
        args.output.mkdir(parents=True, exist_ok=True)
        (args.output / "PLACEHOLDER.txt").write_text(
            "Install transformers + peft to merge adapters.",
            encoding="utf-8",
        )
        print("Dependencies missing — placeholder written")


if __name__ == "__main__":
    main()
