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


async def call_ai_proxy(messages: list[dict], model: str = DEFAULT_AI_MODEL, **kwargs) -> str:
    if not DEFAULT_AI_URL or not DEFAULT_AI_KEY:
        raise HTTPException(
            status_code=500,
            detail="AI 服务未配置：请设置环境变量 AI_API_URL 和 AI_API_KEY"
        )
    
    payload = {
        "model": model,
        "messages": messages,
        "temperature": kwargs.get("temperature", 0.7),
        "max_tokens": kwargs.get("max_tokens", 8192),
    }
    
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
        try:
            err_data = response.json()
            # print(err_data)
            err_msg = err_data.get("error", {}).get("message", str(response.status_code))
        except:
            err_msg = await response.text()
        raise HTTPException(status_code=response.status_code, detail=f"AI 服务错误: {err_msg}")
    
    data = response.json()
    return data["choices"][0]["message"]["content"].strip()