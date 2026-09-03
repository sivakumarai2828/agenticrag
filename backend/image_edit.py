"""Cloud image editing provider for Agentic RAG.

Credentials stay server-side. The browser uploads image bytes to our backend,
and the backend calls the hosted Qwen image-edit model.
"""

import base64
import os
import time
from typing import Any, Dict

import requests


REPLICATE_API_URL = "https://api.replicate.com/v1/predictions"
REPLICATE_MODEL = os.environ.get(
    "REPLICATE_QWEN_IMAGE_EDIT_MODEL", "qwen/qwen-image-edit-2511"
)


def _data_uri(image_bytes: bytes, content_type: str) -> str:
    encoded = base64.b64encode(image_bytes).decode("ascii")
    return f"data:{content_type};base64,{encoded}"


def edit_image(image_bytes: bytes, content_type: str, prompt: str) -> Dict[str, Any]:
    """Edit an image through Replicate's hosted Qwen image editor."""
    token = os.environ.get("REPLICATE_API_TOKEN")
    if not token:
        raise RuntimeError("REPLICATE_API_TOKEN is not configured")
    if not prompt or not prompt.strip():
        raise ValueError("Prompt is required")
    if content_type not in {"image/jpeg", "image/png", "image/webp", "image/gif"}:
        raise ValueError("Supported image types: JPEG, PNG, WEBP, GIF")
    if len(image_bytes) > 10 * 1024 * 1024:
        raise ValueError("Image must be 10 MB or smaller")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    payload = {
        "version": REPLICATE_MODEL,
        "input": {
            "image": _data_uri(image_bytes, content_type),
            "prompt": prompt.strip(),
            "output_format": "webp",
            "output_quality": 95,
        },
    }

    response = requests.post(REPLICATE_API_URL, headers=headers, json=payload, timeout=60)
    if not response.ok:
        raise RuntimeError(
            f"Image provider error: {response.status_code} {response.text[:500]}"
        )

    prediction = response.json()
    poll_url = prediction.get("urls", {}).get("get")
    if not poll_url:
        raise RuntimeError("Image provider did not return a polling URL")

    for _ in range(120):
        poll = requests.get(
            poll_url,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        if not poll.ok:
            raise RuntimeError(f"Image provider polling error: {poll.status_code}")

        state = poll.json()
        status = state.get("status")
        if status == "succeeded":
            output = state.get("output")
            if isinstance(output, list):
                output = output[0] if output else None
            if not output:
                raise RuntimeError("Image provider returned no output image")
            return {
                "success": True,
                "imageUrl": output,
                "predictionId": state.get("id"),
            }
        if status in {"failed", "canceled"}:
            raise RuntimeError(state.get("error") or f"Image generation {status}")

        time.sleep(2)

    raise RuntimeError("Image generation timed out")
