import os
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


async def get_llm_response(
    messages: list[dict],
    system_prompt: str,
    max_tokens: int = 800,
) -> str:
    """
    Try providers in order: Groq → OpenAI → Gemini.
    Returns the first successful text response.
    """

    # ── 1. Groq (Llama 3 70B) ─────────────────────────────────────────────────
    if GROQ_API_KEY:
        try:
            from groq import Groq

            client = Groq(api_key=GROQ_API_KEY)
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "system", "content": system_prompt}] + messages,
                max_tokens=max_tokens,
                temperature=0.7,
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"[LLM] Groq failed: {e}")

    # ── 2. OpenAI GPT-4o (fallback) ───────────────────────────────────────────
    if OPENAI_API_KEY:
        try:
            from openai import OpenAI

            client = OpenAI(api_key=OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "system", "content": system_prompt}] + messages,
                max_tokens=max_tokens,
                temperature=0.7,
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"[LLM] OpenAI failed: {e}")

    # ── 3. Google Gemini (final fallback) ─────────────────────────────────────
    if GEMINI_API_KEY:
        try:
            import httpx
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
            full_prompt = (
                system_prompt
                + "\n\n"
                + "\n".join([f"{m['role']}: {m['content']}" for m in messages])
            )
            payload = {
                "contents": [
                    {
                        "parts": [{"text": full_prompt}]
                    }
                ]
            }
            res = httpx.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=30.0)
            if res.status_code == 200:
                data = res.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
            else:
                print(f"[LLM] Gemini API error: {res.status_code} - {res.text}")
        except Exception as e:
            print(f"[LLM] Gemini HTTP request failed: {e}")

    # ── All providers failed ───────────────────────────────────────────────────
    raise HTTPException(
        status_code=503,
        detail="AI service temporarily unavailable. Please try again.",
    )


def get_provider_status() -> dict:
    """Return which LLM providers are currently configured (key present & non-empty)."""
    return {
        "groq": bool(GROQ_API_KEY),
        "openai": bool(OPENAI_API_KEY),
        "gemini": bool(GEMINI_API_KEY),
    }
