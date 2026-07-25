import os
import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException
from database import SessionLocal
from utils.llm_client import get_llm_response
from models.uploaded_note import UploadedNote
from models.note_summary import NoteSummary
from models.summary_version import SummaryVersion

SYSTEM_PROMPT = """You are an expert professor and academic content designer for MCA (Master of Computer Applications) students at {university}.
Your task is to generate a comprehensive, structured, and exam-ready revision summary from the study notes provided.

You MUST follow this exact format:

## Unit Overview
[2-3 sentence overview of what this unit covers]

## Key Concepts
• Concept 1: [one line explanation]
• Concept 2: [one line explanation]
...

## Important Definitions
**Term:** Definition
**Term:** Definition
...

## Algorithms / Formulas
[If applicable — pseudocode or formula with brief explanation. If not applicable, write "Not applicable for this unit."]

## Exam Tips
⚡ [Tip 1 — what type of question this generates, e.g. "This topic is frequently asked as a 10-mark question..."]
⚡ [Tip 2]
...

## 5 Likely Exam Questions
1. [Question]
2. [Question]
3. [Question]
4. [Question]
5. [Question]

Do NOT add any other introduction, markdown styling outside this template, or conversational filler. Keep definitions precise. Ground concepts in the {subject} ({unit}) curriculum.
"""

USER_PROMPT = """Here are the study notes for the subject "{subject}", unit "{unit}":

{text}

Please generate the structured revision summary now.
"""

async def generate_summary(text: str, subject: str, unit: str, university: str = "Mohanlal Sukhadia University, Udaipur") -> str:
    """
    Generate a structured notes summary using GPT-4o as primary, falling back to Groq Llama 3.
    """
    truncated_text = text[:10000]  # Limit to 10k characters for token efficiency
    sys_prompt = SYSTEM_PROMPT.format(university=university, subject=subject, unit=unit)
    user_prompt = USER_PROMPT.format(subject=subject, unit=unit, text=truncated_text)

    # 1. Primary: GPT-4o
    openai_key = os.getenv("OPENAI_API_KEY", "")
    if openai_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=1500,
                temperature=0.3
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"[Summarizer Service] OpenAI GPT-4o failed: {e}. Falling back to Groq...")

    # 2. Fallback: Groq (Llama 3)
    groq_key = os.getenv("GROQ_API_KEY", "")
    if groq_key:
        try:
            from groq import Groq
            client = Groq(api_key=groq_key)
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=1500,
                temperature=0.3
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"[Summarizer Service] Groq Llama 3 failed: {e}. Falling back to Gemini...")

    # 3. Last resort fallback to general LLM response utility
    try:
        res = await get_llm_response(
            messages=[{"role": "user", "content": user_prompt}],
            system_prompt=sys_prompt,
            max_tokens=1500
        )
        return res.strip()
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"All summarization AI providers failed: {str(e)}"
        )

async def regenerate_summary(db: Session, note_id: uuid.UUID, created_by_ai: bool = True) -> NoteSummary:
    """
    Force a summary re-generation for a note, incrementing version numbers.
    """
    note = db.query(UploadedNote).filter(UploadedNote.id == note_id).first()
    if not note:
        raise ValueError("Note not found")

    # Fetch existing summary record
    summary = db.query(NoteSummary).filter(NoteSummary.note_id == note_id).first()
    
    new_text = await generate_summary(
        text=note.raw_text or "",
        subject=note.subject.name if note.subject else "Syllabus Topic",
        unit=note.unit
    )

    if not summary:
        summary = NoteSummary(
            id=uuid.uuid4(),
            note_id=note_id,
            status="DRAFT",
            current_version=1
        )
        db.add(summary)
        db.commit()
        db.refresh(summary)
        
        version = SummaryVersion(
            id=uuid.uuid4(),
            summary_id=summary.id,
            version_number=1,
            summary_text=new_text,
            created_by_ai=created_by_ai
        )
        db.add(version)
    else:
        # Increment version
        summary.status = "DRAFT"
        summary.current_version += 1
        db.add(summary)
        
        version = SummaryVersion(
            id=uuid.uuid4(),
            summary_id=summary.id,
            version_number=summary.current_version,
            summary_text=new_text,
            created_by_ai=created_by_ai
        )
        db.add(version)

    db.commit()
    db.refresh(summary)
    return summary
