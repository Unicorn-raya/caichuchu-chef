"""AI 代理模块：前端通过后端调用第三方 AI API，隐藏密钥"""
from __future__ import annotations

import os
from typing import Any

from dotenv import load_dotenv
from fastapi import HTTPException
import httpx

load_dotenv()

DEFAULT_AI_URL = os.getenv("AI_API_URL", "")
DEFAULT_AI_KEY = os.getenv("AI_API_KEY", "")
DEFAULT_AI_MODEL = os.getenv("AI_MODEL_ID", "")


def get_ai_config_status() -> dict:
    """返回 AI 配置状态（不暴露敏感值），用于诊断"""
    return {
        "url_set": bool(DEFAULT_AI_URL),
        "key_set": bool(DEFAULT_AI_KEY),
        "model_set": bool(DEFAULT_AI_MODEL),
        "model": DEFAULT_AI_MODEL or "(未设置)",
        "url_prefix": DEFAULT_AI_URL[:30] + "..." if DEFAULT_AI_URL else "(未设置)",
    }


async def call_ai_proxy(messages: list[dict], model: str = DEFAULT_AI_MODEL, **kwargs) -> str:
    if not DEFAULT_AI_URL or not DEFAULT_AI_KEY:
        raise HTTPException(
            status_code=500,
            detail="AI 服务未配置：请设置环境变量 AI_API_URL 和 AI_API_KEY"
        )

    payload = {
        "model": model or DEFAULT_AI_MODEL,
        "messages": messages,
        "temperature": kwargs.get("temperature", 0.7),
        "max_tokens": kwargs.get("max_tokens", 8192),
    }

    print(f"[AI Proxy] 调用 {DEFAULT_AI_URL}/chat/completions, model={payload['model']}")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{DEFAULT_AI_URL}/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {DEFAULT_AI_KEY}",
                },
                json=payload,
                timeout=120.0,
            )
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="AI 请求超时")
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"AI 服务不可用: {str(e)}")

    if not response.is_success:
        # httpx 的 response.text 是属性（同步），不是协程
        err_text = response.text
        print(f"[AI Proxy] 第三方 API 返回错误 {response.status_code}: {err_text[:500]}")
        try:
            err_data = response.json()
            err_msg = err_data.get("error", {}).get("message") or err_data.get("message") or str(response.status_code)
        except Exception:
            err_msg = err_text[:300]
        raise HTTPException(status_code=response.status_code, detail=f"AI 服务错误: {err_msg}")

    try:
        data = response.json()
        return data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError) as e:
        print(f"[AI Proxy] 解析响应失败: {response.text[:500]}")
        raise HTTPException(status_code=502, detail=f"AI 响应格式错误: {str(e)}")
