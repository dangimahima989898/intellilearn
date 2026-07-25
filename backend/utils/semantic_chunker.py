"""
Semantic Chunker for splitting course note text into coherent chunks.

Splits extracted note text into semantically coherent chunks suitable for
embedding, using sentence-boundary and topic-shift detection rather than
fixed-size splitting.
"""

import re
from dataclasses import dataclass


@dataclass
class ChunkResult:
    """Result of chunking a section of text."""
    chunk_text: str
    chunk_index: int
    topic_hint: str
    token_count: int


@dataclass
class UnitSection:
    """A section of text identified by its unit title."""
    title: str
    text: str


class SemanticChunker:
    """Splits extracted note text into semantically coherent chunks."""

    # Regex to detect unit headers: Unit 1, Unit 2, ..., Unit I, Unit II, etc.
    # Matches "Unit X" at start of text, after newline, or after sentence-ending
    # punctuation to handle PDF-extracted text where headers may not always be
    # on their own lines.
    UNIT_HEADER_PATTERN = re.compile(
        r"(?:(?:^|\n|(?<=[.!?]\s))\s*)(unit\s+(?:[ivxlcdm]+|\d+))\b",
        re.IGNORECASE,
    )

    # Regex to split text at sentence boundaries.
    # A sentence ends with . or ? or ! followed by whitespace or end of string.
    SENTENCE_BOUNDARY_PATTERN = re.compile(
        r"(?<=[.!?])(?:\s+|$)"
    )

    def __init__(
        self,
        min_tokens: int = 200,
        max_tokens: int = 800,
        overlap_tokens: int = 50,
    ):
        self.min_tokens = min_tokens
        self.max_tokens = max_tokens
        self.overlap_tokens = overlap_tokens

    def chunk(self, raw_text: str, note_title: str = "") -> list[ChunkResult]:
        """
        Split raw_text into chunks respecting:
        - Unit boundaries as primary split points
        - Sentence boundaries within token limits
        - Overlap between consecutive chunks

        If the entire text is <= min_tokens, returns a single chunk (identity).
        """
        if not raw_text or not raw_text.strip():
            return []

        text = raw_text.strip()
        tokens = text.split()

        # Short text: single chunk identity transformation
        if len(tokens) <= self.min_tokens:
            # Check if text contains a unit header to derive topic_hint
            sections = self._split_by_units(text)
            hint = sections[0].title if sections else "General"
            return [
                ChunkResult(
                    chunk_text=text,
                    chunk_index=0,
                    topic_hint=self._derive_topic_hint(hint, "General"),
                    token_count=len(tokens),
                )
            ]

        # Split by unit sections
        sections = self._split_by_units(text)

        # Process each section into chunks
        all_chunks: list[ChunkResult] = []
        global_index = 0

        for section in sections:
            section_chunks = self._split_section_into_chunks(section)
            for chunk in section_chunks:
                all_chunks.append(
                    ChunkResult(
                        chunk_text=chunk.chunk_text,
                        chunk_index=global_index,
                        topic_hint=chunk.topic_hint,
                        token_count=chunk.token_count,
                    )
                )
                global_index += 1

        return all_chunks

    def _split_by_units(self, text: str) -> list[UnitSection]:
        """
        Detect unit headers and split text into sections.
        If no unit headers are found, returns a single section with title "General".
        """
        # Find all unit header matches with their positions
        matches = list(self.UNIT_HEADER_PATTERN.finditer(text))

        if not matches:
            return [UnitSection(title="General", text=text.strip())]

        sections: list[UnitSection] = []

        # Text before the first unit header
        first_start = matches[0].start()
        if first_start > 0:
            intro_text = text[:first_start].strip()
            if intro_text:
                sections.append(UnitSection(title="General", text=intro_text))

        # Each unit section
        for i, match in enumerate(matches):
            title = match.group(1).strip()
            start = match.end()
            # End is the start of the next match, or end of text
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            section_text = text[start:end].strip()
            if section_text:
                sections.append(UnitSection(title=title, text=section_text))

        # If no sections ended up with text, return the whole thing
        if not sections:
            return [UnitSection(title="General", text=text.strip())]

        return sections

    def _split_section_into_chunks(self, section: UnitSection) -> list[ChunkResult]:
        """
        Token-based splitting within a unit section at sentence boundaries.
        Handles overlap between consecutive chunks.
        """
        text = section.text.strip()
        if not text:
            return []

        tokens = text.split()

        # If section fits in a single chunk, return it directly
        if len(tokens) <= self.max_tokens:
            return [
                ChunkResult(
                    chunk_text=text,
                    chunk_index=0,  # Will be reassigned by caller
                    topic_hint=self._derive_topic_hint(section.title, "General"),
                    token_count=len(tokens),
                )
            ]

        # Split into sentences
        sentences = self._split_into_sentences(text)

        chunks: list[ChunkResult] = []
        current_sentences: list[str] = []
        current_token_count = 0

        i = 0
        while i < len(sentences):
            sentence = sentences[i]
            sentence_tokens = len(sentence.split())

            # Handle single sentence exceeding max_tokens
            if sentence_tokens > self.max_tokens and current_token_count == 0:
                # This oversized sentence becomes its own chunk
                chunks.append(
                    ChunkResult(
                        chunk_text=sentence,
                        chunk_index=0,
                        topic_hint=self._derive_topic_hint(section.title, "General"),
                        token_count=sentence_tokens,
                    )
                )
                i += 1
                continue

            # If adding this sentence would exceed max_tokens, finalize current chunk
            if current_token_count + sentence_tokens > self.max_tokens and current_sentences:
                chunk_text = " ".join(current_sentences)
                chunk_token_count = len(chunk_text.split())
                chunks.append(
                    ChunkResult(
                        chunk_text=chunk_text,
                        chunk_index=0,
                        topic_hint=self._derive_topic_hint(section.title, "General"),
                        token_count=chunk_token_count,
                    )
                )

                # Calculate overlap: take trailing overlap_tokens from current chunk
                overlap_sentences = self._get_overlap_sentences(
                    current_sentences, self.overlap_tokens
                )
                current_sentences = overlap_sentences
                current_token_count = sum(
                    len(s.split()) for s in current_sentences
                )
                # Don't increment i — re-evaluate this sentence with the overlap
                continue

            # Add sentence to current chunk
            current_sentences.append(sentence)
            current_token_count += sentence_tokens
            i += 1

        # Finalize last chunk if there's remaining content
        if current_sentences:
            chunk_text = " ".join(current_sentences)
            chunk_token_count = len(chunk_text.split())

            # If the last chunk is too small and we have a previous chunk,
            # merge it into the previous chunk (unless that would exceed max_tokens)
            if (
                chunk_token_count < self.min_tokens
                and chunks
                and chunks[-1].token_count + chunk_token_count <= self.max_tokens
            ):
                merged_text = chunks[-1].chunk_text + " " + chunk_text
                merged_token_count = len(merged_text.split())
                chunks[-1] = ChunkResult(
                    chunk_text=merged_text,
                    chunk_index=0,
                    topic_hint=chunks[-1].topic_hint,
                    token_count=merged_token_count,
                )
            else:
                chunks.append(
                    ChunkResult(
                        chunk_text=chunk_text,
                        chunk_index=0,
                        topic_hint=self._derive_topic_hint(section.title, "General"),
                        token_count=chunk_token_count,
                    )
                )

        return chunks

    def _split_into_sentences(self, text: str) -> list[str]:
        """
        Split text into sentences at sentence boundaries.
        A sentence boundary is a period, question mark, or exclamation mark
        followed by whitespace or end of string.
        """
        # Split at sentence boundaries
        parts = self.SENTENCE_BOUNDARY_PATTERN.split(text)
        sentences = [part.strip() for part in parts if part.strip()]
        return sentences

    def _get_overlap_sentences(
        self, sentences: list[str], target_tokens: int
    ) -> list[str]:
        """
        Get trailing sentences from a chunk to use as overlap for the next chunk.
        Aims for overlap_tokens worth of tokens (50-100 range).
        """
        overlap: list[str] = []
        token_count = 0

        # Work backwards from the end of the sentences
        for sentence in reversed(sentences):
            sentence_token_count = len(sentence.split())
            if token_count + sentence_token_count > target_tokens * 2:
                # Don't exceed 100 tokens (2x overlap_tokens)
                break
            overlap.insert(0, sentence)
            token_count += sentence_token_count
            if token_count >= target_tokens:
                break

        return overlap

    def _derive_topic_hint(self, primary: str, fallback: str) -> str:
        """
        Derive topic_hint from nearest heading, max 200 chars.
        Falls back to 'General' if primary is empty.
        """
        hint = primary.strip() if primary and primary.strip() else fallback
        # Truncate to 200 characters
        if len(hint) > 200:
            hint = hint[:200]
        return hint
