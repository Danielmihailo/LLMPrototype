import os
from jarvis.inference.mock_backend import MockBackend


def get_backend():
    backend = os.environ.get("BRAIN_BACKEND", "mock").lower()
    if backend == "ollama":
        from jarvis.inference.ollama_backend import OllamaBackend

        return OllamaBackend()
    if backend == "llama.cpp" or backend == "llamacpp":
        from jarvis.inference.llama_cpp_backend import LlamaCppBackend

        return LlamaCppBackend()
    if backend == "vllm":
        from jarvis.inference.vllm_backend import VllmBackend

        return VllmBackend()
    return MockBackend()
