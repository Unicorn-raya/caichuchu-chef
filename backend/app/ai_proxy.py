"""AI 代理模块：前端通过后端调用第三方 AI API，隐藏密钥（使用 OpenAI SDK）"""
from __future__ import annotations

import os
from typing import Any

from dotenv import load_dotenv
from fastapi import HTTPException
from openai import OpenAI, APIError, APIConnectionError, APITimeoutError, AuthenticationError

load_dotenv()

DEFAULT_AI_URL = os.getenv("AI_API_URL", "")
DEFAULT_AI_KEY = os.getenv("AI_API_KEY", "")
DEFAULT_AI_MODEL = os.getenv("AI_MODEL_ID", "")

# 全局 OpenAI 客户端（延迟初始化）
_client: OpenAI | None = None


def get_client() -> OpenAI:
    """获取 OpenAI 客户端单例"""
    global _client
    if _client is None:
        if not DEFAULT_AI_URL or not DEFAULT_AI_KEY:
            raise HTTPException(
                status_code=500,
                detail="AI 服务未配置：请设置环境变量 AI_API_URL 和 AI_API_KEY"
            )
        _client = OpenAI(
            api_key=DEFAULT_AI_KEY,
            base_url=DEFAULT_AI_URL,
        )
    return _client


def get_ai_config_status() -> dict:
    """返回 AI 配置状态（不暴露敏感值），用于诊断"""
    return {
        "url_set": bool(DEFAULT_AI_URL),
        "key_set": bool(DEFAULT_AI_KEY),
        "model_set": bool(DEFAULT_AI_MODEL),
        "model": DEFAULT_AI_MODEL or "(未设置)",
        "url_prefix": DEFAULT_AI_URL[:30] + "..." if DEFAULT_AI_URL else "(未设置)",
    }


def call_ai_proxy(messages: list[dict], model: str = DEFAULT_AI_MODEL, **kwargs) -> str:
    """通过 OpenAI SDK 调用 AI 接口（同步）

    当传入 url 和 api_key 时，创建 per-request 客户端（用于自定义模型）；
    否则使用后端环境变量配置的单例客户端（用于内置模型）。
    """
    custom_url = kwargs.get("url")
    custom_key = kwargs.get("api_key")

    if custom_url and custom_key:
        # 自定义模型：per-request 客户端
        client = OpenAI(
            api_key=custom_key,
            base_url=custom_url,
        )
        target_model = model or ""
        print(f"[AI Proxy] 自定义模型调用, base_url={custom_url}, model={target_model}")
    else:
        # 内置模型：使用环境变量配置的单例客户端
        if not DEFAULT_AI_URL or not DEFAULT_AI_KEY:
            raise HTTPException(
                status_code=500,
                detail="AI 服务未配置：请设置环境变量 AI_API_URL 和 AI_API_KEY"
            )
        client = get_client()
        target_model = model or DEFAULT_AI_MODEL
        print(f"[AI Proxy] 内置模型调用, base_url={DEFAULT_AI_URL}, model={target_model}")

    if not target_model:
        raise HTTPException(status_code=400, detail="未指定模型名称")

    try:
        response = client.chat.completions.create(
            model=target_model,
            messages=messages,
            stream=False,
        )
    except AuthenticationError as e:
        print(f"[AI Proxy] 认证失败: {e}")
        raise HTTPException(status_code=401, detail=f"AI 认证失败（Key 无效）: {str(e)}")
    except APITimeoutError:
        raise HTTPException(status_code=504, detail="AI 请求超时")
    except APIConnectionError as e:
        print(f"[AI Proxy] 连接失败: {e}")
        raise HTTPException(status_code=503, detail=f"AI 服务不可达: {str(e)}")
    except APIError as e:
        print(f"[AI Proxy] API 错误 {e.status_code}: {e.message}")
        raise HTTPException(
            status_code=e.status_code or 502,
            detail=f"AI 服务错误: {e.message}"
        )
    except Exception as e:
        print(f"[AI Proxy] 未知错误: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"AI 调用异常: {str(e)}")

    content = response.choices[0].message.content
    if not content:
        raise HTTPException(status_code=502, detail="AI 返回空内容")
    return content.strip()
