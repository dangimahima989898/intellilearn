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
                model="llama3-70b-8192",
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
            import google.generativeai as genai

            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-1.5-flash")
            full_prompt = (
                system_prompt
                + "\n\n"
                + "\n".join([f"{m['role']}: {m['content']}" for m in messages])
            )
            response = model.generate_content(full_prompt)
            return response.text
        except Exception as e:
            print(f"[LLM] Gemini failed: {e}")

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
