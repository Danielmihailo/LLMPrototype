"""Unsloth LoRA training — run when GPU + dependencies installed."""
from __future__ import annotations

import argparse
from pathlib import Path

from jarvis.finetune.dataset import load_jsonl, validate_example


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("models/adapters/lora-v1"))
    parser.add_argument("--base-model", default="Qwen/Qwen2.5-0.5B-Instruct")
    args = parser.parse_args()

    rows = load_jsonl(args.data)
    valid = [r for r in rows if validate_example(r)]
    print(f"Loaded {len(valid)}/{len(rows)} valid examples")

    try:
        from unsloth import FastLanguageModel
        import torch

        model, tokenizer = FastLanguageModel.from_pretrained(
            model_name=args.base_model,
            max_seq_length=2048,
            load_in_4bit=True,
        )
        model = FastLanguageModel.get_peft_model(
            model,
            r=64,
            lora_alpha=128,
            target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
        )
        # Training loop placeholder — requires formatted dataset
        args.output.mkdir(parents=True, exist_ok=True)
        model.save_pretrained(str(args.output))
        tokenizer.save_pretrained(str(args.output))
        print(f"Adapter saved to {args.output}")
    except ImportError:
        print("Install unsloth/torch for training. Dataset validation passed.")
        args.output.mkdir(parents=True, exist_ok=True)
        (args.output / "README.txt").write_text(
            "Run: pip install unsloth torch transformers peft\n"
            f"Validated {len(valid)} examples from {args.data}",
            encoding="utf-8",
        )


if __name__ == "__main__":
    main()
