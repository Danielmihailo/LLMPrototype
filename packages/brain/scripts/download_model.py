"""Download base model weights from HuggingFace (requires huggingface_hub)."""
from __future__ import annotations

import argparse
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="Qwen/Qwen2.5-0.5B-Instruct")
    parser.add_argument("--output", type=Path, default=Path("models/base"))
    args = parser.parse_args()
    try:
        from huggingface_hub import snapshot_download

        path = snapshot_download(repo_id=args.model, local_dir=str(args.output / args.model.replace("/", "--")))
        print(f"Downloaded to {path}")
    except ImportError:
        print("pip install huggingface_hub")
        args.output.mkdir(parents=True, exist_ok=True)
        (args.output / "README.txt").write_text(
            f"Download {args.model} manually into this folder.",
            encoding="utf-8",
        )


if __name__ == "__main__":
    main()
