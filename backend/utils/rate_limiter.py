from fastapi import HTTPException, status
import time
from typing import Dict, List

_rate_limits: Dict[str, List[float]] = {}

def check_rate_limit(student_id: str, endpoint: str, max_requests: int, window_seconds: int = 3600):
    key = f"{student_id}:{endpoint}"
    now = time.time()
    
    if key not in _rate_limits:
        _rate_limits[key] = []
        
    # Clean up old entries
    _rate_limits[key] = [t for t in _rate_limits[key] if now - t < window_seconds]
    
    if len(_rate_limits[key]) >= max_requests:
        wait_time = int(window_seconds - (now - _rate_limits[key][0]))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Try again in {wait_time} seconds."
        )
        
    _rate_limits[key].append(now)
