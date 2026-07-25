import uuid
import json
from sqlalchemy import Column, DateTime, ForeignKey, String, Text, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    color = Column(String(7), default="#3B82F6")
    icon = Column(String(50), default="BookOpen")
    is_archived = Column(Boolean, default=False, nullable=False)
    archived_at = Column(DateTime(timezone=True), nullable=True)

    # Course & Semester columns
    course_id        = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=True)
    department_id    = Column(UUID(as_uuid=True), ForeignKey("departments.department_id"), nullable=True)
    semester_id      = Column(UUID(as_uuid=True), ForeignKey("semesters.id"), nullable=True)
    semester_number  = Column(Integer, nullable=True)   # Legacy, to be migrated to semester_id
    credit_hours     = Column(Integer, default=3)
    syllabus_pdf_url = Column(String(500), nullable=True)

    # Relationships
    course = relationship("Course", back_populates="subjects")
    department = relationship("Department", back_populates="subjects")
    semester = relationship("Semester", back_populates="subjects")
    faculty_assignments = relationship("FacultySubjectAssignment", back_populates="subject", cascade="all, delete-orphan")

    # ── RAG content fields ─────────────────────────────────────────────────────
    # Stored as JSON-encoded list e.g. '["Arrays", "Linked Lists", "Sorting"]'
    topics_list   = Column(Text, nullable=True)
    # Admin-pasted raw syllabus text used as LLM fallback context
    syllabus_text = Column(Text, nullable=True)

    # Accreditation fields (JSON strings)
    co_po_mappings = Column(Text, nullable=True)
    revision_history = Column(Text, nullable=True)
    ownership_history = Column(Text, nullable=True)

    # Relationships
    course = relationship("Course", back_populates="subjects")
    notes = relationship("Note", back_populates="subject")
    questions = relationship("Question", back_populates="subject")
    timetable = relationship("Timetable", back_populates="subject")
    content_chunks = relationship(
        "ContentChunk",
        back_populates="subject",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )

    # ── Helpers ────────────────────────────────────────────────────────────────
    def get_topics(self) -> list[str]:
        """Return topics_list decoded from JSON, or empty list."""
        if not self.topics_list:
            return []
        try:
            return json.loads(self.topics_list)
        except Exception:
            return []

    def set_topics(self, topics: list[str]):
        """JSON-encode and store topics list."""
        self.topics_list = json.dumps(topics) if topics else None
