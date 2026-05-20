import re

def sanitize_text(text: str) -> str:
    if text is None:
        return None
    return re.sub(r'<[^>]+>', '', text).strip()
