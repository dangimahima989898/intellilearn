# Requirements Document

## Introduction

This document specifies requirements for enhancing the existing Notes & Summaries module in the IntelliLearn AI-powered University ERP system. The module currently features two tabs — "My Notes" and "AI Summaries" — with basic file listing and download capabilities. This enhancement transforms the module into an AI-powered study workspace by enriching note cards with metadata and AI actions, converting the empty AI Summaries tab into a comprehensive AI revision center, adding personalized study analytics, and integrating a floating AI assistant. The existing page layout, sidebar, navigation, card design, purple accent theme, typography, spacing, and IntelliLearn branding are preserved. Only functional behavior and content within cards are enhanced.

## Glossary

- **Notes_Module**: The Notes & Summaries page in the IntelliLearn platform containing the My Notes tab and AI Summaries tab
- **My_Notes_Tab**: The first tab in the Notes_Module displaying uploaded lecture notes as cards
- **AI_Summaries_Tab**: The second tab in the Notes_Module providing AI-generated summaries and revision tools
- **Note_Card**: A UI card component in the My_Notes_Tab representing a single uploaded note file
- **Summary_Card**: A UI card component in the AI_Summaries_Tab representing a single AI-generated or faculty-created summary
- **Student**: An authenticated user with role "student" in the IntelliLearn system
- **AI_Engine**: The backend AI service that generates summaries, flashcards, quizzes, explanations, translations, and study recommendations
- **Faculty**: An authenticated user with role "faculty" who uploads notes and verifies summaries
- **Note_Service**: The backend service managing note metadata, file storage, and retrieval
- **Summary_Service**: The backend service managing AI-generated and faculty-verified summaries
- **Performance_Service**: The backend service providing quiz scores, topic accuracy, and weak topic data from StudentPerformanceSummary records
- **Activity_Service**: The backend service tracking student reading progress, bookmarks, and interaction history via StudentActivityLog records
- **Smart_Badge**: An AI-generated visual indicator on a Note_Card conveying study relevance information
- **Reading_Progress**: A per-student, per-note tracker recording the percentage of a note the student has consumed
- **Bookmark**: A student-saved reference to a specific note for quick future access
- **Summary_Mode**: A specific format in which an AI summary is generated (e.g., One Page, Bullet, Mind Map)
- **AI_Confidence**: A percentage (0 to 100) representing the AI_Engine's self-assessed accuracy of a generated summary
- **Revision_Assistant**: The side-panel AI component in the AI_Summaries_Tab that plans and guides revision sessions
- **Floating_AI_Assistant**: A persistent floating action button available across the Notes_Module providing contextual AI actions
- **Weak_Topic**: A topic where the student's quiz accuracy is below 60 percent as computed from StudentPerformanceSummary weak_topics data

## Requirements

### Requirement 1: Enhanced Note Card Metadata Display

**User Story:** As a student, I want each note card to display comprehensive metadata, so that I can quickly assess a note's relevance, recency, and scope without opening it.

#### Acceptance Criteria

1. THE Note_Card SHALL display the following metadata fields retrieved from the Note_Service: Subject Name, Unit Number, Faculty Name, Uploaded Date, File Size in megabytes (rounded to one decimal place), File Type (PDF, PPT, PPTX, or DOC), Semester Number, Estimated Reading Time in minutes, Download Count, and Last Updated Date.
2. WHEN a note record does not have a Unit Number assigned, THE Note_Card SHALL omit the Unit Number field without displaying a placeholder or empty value.
3. THE Note_Card SHALL display the Uploaded Date as a relative time string (e.g., "3 days ago") when the upload occurred within 30 days, and as an absolute date in "DD Mon YYYY" format (e.g., "15 Jan 2025") when older than 30 days.
4. THE Note_Service SHALL compute Estimated Reading Time as the file page count multiplied by 2 minutes per page for PDF files, and file size in kilobytes divided by 50 for PPT, PPTX, and DOC files, returning the result as a whole number of minutes (rounded up) with a minimum value of 1.
5. WHEN the Last Updated Date is different from the Uploaded Date, THE Note_Card SHALL display both dates; WHEN they are identical, THE Note_Card SHALL display only the Uploaded Date.
6. IF a note's file size is unavailable, THEN THE Note_Card SHALL display "Size unavailable" in place of the file size value and SHALL omit the Estimated Reading Time field for that note.
7. IF a note's file type is not one of PDF, PPT, PPTX, or DOC, THEN THE Note_Card SHALL display the file type value as-is and SHALL omit the Estimated Reading Time field for that note.

### Requirement 2: Quick AI Actions on Note Cards

**User Story:** As a student, I want AI-powered action buttons on each note card, so that I can instantly generate summaries, flashcards, quizzes, and other study aids from any note.

#### Acceptance Criteria

1. THE Note_Card SHALL display the following action buttons: View Note, AI Summary, Explain Difficult Topics, Generate Flashcards, Generate MCQs, Generate Viva Questions, Translate Notes, Listen as Audio, and Download.
2. WHEN a student clicks "View Note", THE Notes_Module SHALL open the note file in an in-app viewer within 3 seconds.
3. WHEN a student clicks "AI Summary", THE AI_Engine SHALL generate a summary of the note content between 50 and 300 words in length and display it in a modal overlay within 15 seconds.
4. WHEN a student clicks "Explain Difficult Topics", THE AI_Engine SHALL identify and explain up to 5 concepts from the note content that involve specialized terminology or multi-step reasoning, displayed in a modal overlay within 15 seconds, where each explanation is between 30 and 150 words.
5. WHEN a student clicks "Generate Flashcards", THE AI_Engine SHALL generate between 5 and 20 flashcards from the note content and display them in a navigable card interface within 15 seconds.
6. WHEN a student clicks "Generate MCQs", THE AI_Engine SHALL generate between 5 and 15 multiple-choice questions from the note content with 4 options each, displayed in a quiz interface within 15 seconds.
7. WHEN a student clicks "Generate Viva Questions", THE AI_Engine SHALL generate between 5 and 10 open-ended viva-style questions from the note content with model answers, displayed in a list format within 15 seconds.
8. WHEN a student clicks "Translate Notes", THE Notes_Module SHALL display a language selection dropdown containing a minimum of 5 supported languages; upon selection THE AI_Engine SHALL translate the note content into the chosen language and display the translated result in a modal overlay within 20 seconds.
9. WHEN a student clicks "Listen as Audio", THE AI_Engine SHALL generate a text-to-speech audio stream of the note content and begin playback within 10 seconds, with pause, resume, and stop controls displayed.
10. WHEN a student clicks "Download", THE Note_Service SHALL increment the download count by 1 and initiate a file download of the original note file.
11. IF the AI_Engine fails to complete any AI action within the specified time limit, THEN THE Notes_Module SHALL display an error message indicating that AI generation failed with a Retry button, without navigating the student away from the current view.
12. IF the note file cannot be retrieved or parsed when a student triggers "View Note" or any AI action, THEN THE Notes_Module SHALL display an error message indicating the note file is unavailable, without navigating the student away from the current view.
13. WHILE an AI action is in progress for a note card, THE Notes_Module SHALL display a loading indicator on that action button and SHALL disable that button until the action completes or fails.
14. IF the note content exceeds 50,000 characters when a student triggers "Translate Notes" or "Listen as Audio", THEN THE Notes_Module SHALL process only the first 50,000 characters and display an indicator that the output covers partial content.

### Requirement 3: AI Smart Badges on Note Cards

**User Story:** As a student, I want AI-generated badges on note cards, so that I can quickly identify which notes are most important for my studies and exams.

#### Acceptance Criteria

1. THE Note_Card SHALL display up to 3 Smart_Badge indicators per note, selected from the following types: "Most Studied", "Recommended", "Exam Important", "Faculty Recommended", "Recently Updated", and "Based on Your Weak Topics".
2. THE AI_Engine SHALL assign "Most Studied" badge to notes where the total view count across all students is in the top 10 percent of notes for that subject, considering only subjects with a minimum of 10 notes; IF a subject has fewer than 10 notes, THEN THE AI_Engine SHALL not assign the "Most Studied" badge to any note in that subject.
3. THE AI_Engine SHALL assign "Recommended" badge to notes covering topics identified in the student's StudentPerformanceSummary weak_topics list for the corresponding subject.
4. THE AI_Engine SHALL assign "Exam Important" badge to notes whose associated topics (as defined by the note's subject and tagged topic metadata) appear in 70 percent or more of previous exam questions for that subject, considering only subjects where at least 2 previous exams exist in the system.
5. THE Faculty SHALL assign "Faculty Recommended" badge manually through the faculty note management interface; THE Note_Card SHALL display this badge when the is_faculty_recommended flag is true on the note record.
6. THE Note_Service SHALL assign "Recently Updated" badge to notes whose Last Updated Date is within the last 7 days.
7. THE AI_Engine SHALL assign "Based on Your Weak Topics" badge to notes covering at least one topic from the student's weak_topics list where the student's accuracy on that topic is below 50 percent, computed as (correct answers divided by total answers) from QuizAnswer records for that topic with a minimum of 3 answered questions on that topic required.
8. WHEN more than 3 badges qualify for a single note, THE Note_Card SHALL display the 3 highest-priority badges in the following priority order: Exam Important, Based on Your Weak Topics, Faculty Recommended, Most Studied, Recommended, Recently Updated.
9. THE AI_Engine SHALL recalculate badge assignments once every 24 hours per subject; WHEN a student views a Note_Card, THE Note_Card SHALL display badges from the most recent calculation cycle.
10. IF a student has no StudentPerformanceSummary records for a subject, THEN THE Note_Card SHALL not display "Recommended" or "Based on Your Weak Topics" badges for notes in that subject, and SHALL only display badges computable without personalized performance data ("Most Studied", "Exam Important", "Faculty Recommended", "Recently Updated").
11. IF no badges qualify for a note after evaluation, THEN THE Note_Card SHALL display that note without any Smart_Badge indicators.

### Requirement 4: Notes Search and Filter System

**User Story:** As a student, I want to search and filter notes by multiple criteria, so that I can quickly find specific study materials.

#### Acceptance Criteria

1. THE My_Notes_Tab SHALL display a search bar that performs case-insensitive partial matching of the search text against Note Title, Subject Name, Faculty Name, and Unit Number fields, updating results within 500 milliseconds of the student ceasing keyboard input (debounce), where a match occurs if the search text appears as a contiguous substring within any of the specified fields.
2. THE My_Notes_Tab SHALL provide filter controls for: Department, Semester, Subject, Faculty, Unit Number, and File Type (PDF, PPT, PPTX, DOC).
3. THE My_Notes_Tab SHALL provide sort options: Recently Added (newest created_at first), Most Downloaded (highest download_count first), and Exam Important (notes with Exam Important badge sorted first, then by created_at descending within each group).
4. WHEN multiple filters are applied simultaneously, THE Note_Service SHALL return notes matching all selected filter criteria (AND logic).
5. WHEN a search query or filter combination returns zero results, THE My_Notes_Tab SHALL display "No notes found matching your criteria" with the filter panel remaining visible and a "Clear All Filters" button.
6. THE My_Notes_Tab SHALL display the total count of notes matching the current search and filter criteria, updated each time results change.
7. WHEN a student clears all filters and search text, THE My_Notes_Tab SHALL display all available notes sorted by Recently Added (newest created_at first).
8. THE My_Notes_Tab SHALL display a maximum of 20 notes per page with pagination controls; WHEN more than 20 notes match the current criteria, THE My_Notes_Tab SHALL display "Next" and "Previous" navigation to load additional pages.
9. IF the Note_Service fails to retrieve or filter notes, THEN THE My_Notes_Tab SHALL display an error message indicating that notes could not be loaded, with a "Retry" button, and the filter panel shall remain visible with the student's previous selections preserved.

### Requirement 5: Bookmark and Reading History

**User Story:** As a student, I want to bookmark notes and track my reading history, so that I can quickly return to important materials and continue where I left off.

#### Acceptance Criteria

1. THE Note_Card SHALL display a bookmark toggle icon; WHEN a student clicks the bookmark icon, THE Activity_Service SHALL save a bookmark record for that student-note pair and visually mark the icon as active within 2 seconds.
2. WHEN a student clicks an active bookmark icon, THE Activity_Service SHALL remove the bookmark record and visually mark the icon as inactive within 2 seconds.
3. THE My_Notes_Tab SHALL provide a "Bookmarked" filter view displaying only notes bookmarked by the current student, sorted by bookmark creation date descending.
4. THE My_Notes_Tab SHALL provide a "Recently Viewed" filter view displaying the last 20 notes the student opened, sorted by last view timestamp descending.
5. THE My_Notes_Tab SHALL provide a "Continue Reading" filter view displaying up to 20 notes where the student's Reading_Progress is between 1 percent and 99 percent, sorted by last view timestamp descending.
6. IF the student has zero bookmarked notes, THEN THE Bookmarked view SHALL display "No bookmarked notes yet. Tap the bookmark icon on any note to save it here."
7. IF the student has zero entries in the "Recently Viewed" filter view, THEN THE Recently Viewed view SHALL display "No recently viewed notes. Open any note to start building your reading history."
8. IF the student has zero entries in the "Continue Reading" filter view, THEN THE Continue Reading view SHALL display "No notes in progress. Start reading a note and your progress will appear here."
9. IF the Activity_Service fails to save or remove a bookmark record, THEN THE Note_Card SHALL retain the previous bookmark icon state and display an error message indicating the bookmark action could not be completed, with a Retry option.

### Requirement 6: Reading Progress Tracking

**User Story:** As a student, I want to see my reading progress on each note, so that I know which notes I have completed and where to continue.

#### Acceptance Criteria

1. THE Note_Card SHALL display a progress indicator showing the student's Reading_Progress as a percentage (0 to 100) for that note, rendered as a horizontal progress bar with the numeric percentage value displayed adjacent to it.
2. WHILE a student is viewing a note, THE Activity_Service SHALL track the scroll position and update Reading_Progress to the furthest position reached as a percentage of total content length, persisting the updated value at most once every 5 seconds while scrolling occurs and once when the student navigates away.
3. IF the student has never opened a note (Reading_Progress is 0 percent and no last opened timestamp exists), THEN THE Note_Card SHALL display "Not yet opened" in place of the last opened timestamp.
4. WHEN a student has previously opened a note and Reading_Progress is greater than 0 percent, THE Note_Card SHALL display the last opened timestamp as a relative time string (e.g., "Last opened yesterday") beneath the progress indicator.
5. WHEN Reading_Progress is between 1 percent and 99 percent, THE Note_Card SHALL display a "Continue Reading" button that opens the note at the student's last recorded scroll position.
6. WHEN Reading_Progress is 0 percent (never opened), THE Note_Card SHALL display "Not started" as the progress label.
7. WHEN Reading_Progress is 100 percent, THE Note_Card SHALL display "Completed" with a checkmark indicator.
8. WHEN a student closes or navigates away from an open note, THE Activity_Service SHALL record a reading session entry in StudentActivityLog with action "note_read" and the duration in seconds, where sessions shorter than 3 seconds are discarded and sessions are capped at a maximum of 7200 seconds (2 hours) to account for idle or abandoned sessions.

### Requirement 7: AI Study Insight Card

**User Story:** As a student, I want AI-generated study recommendations at the top of the Notes page, so that I receive actionable guidance on what to study next.

#### Acceptance Criteria

1. WHEN a student opens the My_Notes_Tab, THE AI_Engine SHALL display an AI Insight Card at the top of the page containing a maximum of 3 personalized study recommendations, prioritized in the following order: notes covering topics from the student's weak_topics list first, then notes relevant to quizzes or exams scheduled within the next 7 days, then notes not opened by the student in the last 14 days that cover exam topics scheduled within the next 14 days.
2. THE AI_Engine SHALL generate recommendations based on: notes not opened by the student in the last 14 days that cover topics associated with exams scheduled within the next 14 days, notes covering topics from the student's weak_topics list, and notes whose subject matches the subject of quizzes or exams scheduled within the next 7 days.
3. THE AI Insight Card SHALL display each recommendation with a descriptive message (maximum 120 characters) explaining the reasoning.
4. THE AI Insight Card SHALL display two action buttons: "Open Recommended Notes" which navigates to the highest-priority recommended note as determined by the ordering in criterion 1, and "Create Study Plan" which triggers the AI_Engine to generate a study plan based on the recommendations.
5. WHEN a student clicks "Create Study Plan", THE AI_Engine SHALL generate a study plan within 10 seconds listing between 3 and 10 recommended notes, each with an estimated reading time between 5 and 60 minutes, with total estimated reading time not exceeding 120 minutes.
6. IF the AI_Engine cannot generate recommendations due to insufficient student activity data (fewer than 5 notes viewed), THEN THE AI Insight Card SHALL display "View more notes to unlock personalized AI recommendations" with a progress indicator showing the number of notes the student has viewed out of 5 required.
7. IF the AI_Engine fails to generate recommendations due to a service error, THEN THE AI Insight Card SHALL display "Recommendations unavailable. Try again later." with a Retry button that re-requests recommendation generation from the AI_Engine when clicked.
8. IF fewer than 3 recommendations are available based on the criteria in criterion 2, THEN THE AI Insight Card SHALL display only the available recommendations without placeholder content.

### Requirement 8: AI Summaries Search and Filter

**User Story:** As a student, I want to search and filter AI summaries by subject, unit, difficulty, and verification status, so that I can quickly find relevant revision material.

#### Acceptance Criteria

1. THE AI_Summaries_Tab SHALL display a search bar that filters summaries by matching search text against Subject Name, Unit Number, and Summary Title, updating results within 500 milliseconds of the student pausing typing for at least 300 milliseconds, accepting a minimum of 1 character and a maximum of 200 characters of input.
2. THE AI_Summaries_Tab SHALL provide filter controls for: Subject, Unit Number, Difficulty Level (Beginner, Intermediate, Advanced), Semester, Faculty Approved status, and AI Generated status, with all filters set to their unselected ("All") state on initial tab load.
3. WHEN multiple filters are applied simultaneously or a search query is combined with filters, THE Summary_Service SHALL return only summaries matching all selected filter criteria and the search text (AND logic).
4. IF a search query or filter combination returns zero results, THEN THE AI_Summaries_Tab SHALL display the message "No summaries found matching your criteria" with a "Generate AI Summary" button that navigates the student to the AI summary generation flow.
5. THE AI_Summaries_Tab SHALL display the total count of summaries matching the current search and filter criteria, updated each time the displayed results change.
6. IF the Summary_Service fails to respond within 5 seconds when retrieving search or filter results, THEN THE AI_Summaries_Tab SHALL display an error message indicating that summaries could not be loaded, along with a "Retry" button that re-requests the current search and filter query.
7. WHEN the student clears the search bar or resets all filters, THE AI_Summaries_Tab SHALL display the full unfiltered list of available summaries within 500 milliseconds.
8. THE AI_Summaries_Tab SHALL display a maximum of 20 summary results per page with a pagination control to navigate additional pages when the total matching count exceeds 20.

### Requirement 9: Enhanced Summary Card Display

**User Story:** As a student, I want each summary card to display key metadata and verification status, so that I can assess summary quality and relevance at a glance.

#### Acceptance Criteria

1. THE Summary_Card SHALL display: Subject Name, Unit Number, Summary Length (word count), Estimated Reading Time in minutes, Verification Status (Faculty Verified or AI Generated), AI_Confidence percentage, and Last Updated Date.
2. WHEN a summary has been reviewed and approved by faculty, THE Summary_Card SHALL display a "Faculty Verified" badge with a checkmark icon.
3. WHEN a summary is AI-generated and not faculty-verified, THE Summary_Card SHALL display "AI Generated" with the AI_Confidence percentage (e.g., "AI Generated • 95% confidence").
4. THE Summary_Service SHALL compute Estimated Reading Time as the summary word count divided by 200 words per minute, rounded up to the nearest whole minute with a minimum of 1.
5. THE Summary_Card SHALL display the Last Updated Date as a relative time string when within 30 days, and as an absolute date in "DD Mon YYYY" format when older.
6. IF the Summary_Service fails to retrieve summary metadata, THEN THE Summary_Card SHALL display a loading skeleton placeholder and a "Retry" button.

### Requirement 10: Multiple Summary Generation Modes

**User Story:** As a student, I want to generate summaries in different formats, so that I can choose the revision style best suited to my learning needs.

#### Acceptance Criteria

1. THE AI_Summaries_Tab SHALL provide the following Summary_Mode options for each note: One Page Summary, Bullet Summary, Exam Revision, Last Minute Revision, Mind Map, Flowchart, and Concept Notes.
2. WHEN a student selects "One Page Summary", THE AI_Engine SHALL generate a narrative summary limited to 500 words covering the main topics, definitions, and conclusions from the source note.
3. WHEN a student selects "Bullet Summary", THE AI_Engine SHALL generate a structured bullet-point summary with a maximum of 3 hierarchy levels, a maximum of 30 bullet points total, grouped by topic headings extracted from the source note.
4. WHEN a student selects "Exam Revision", THE AI_Engine SHALL generate a summary limited to 800 words containing sections for definitions, formulas, key theorems, and important points, each section listing items explicitly stated in the source note.
5. WHEN a student selects "Last Minute Revision", THE AI_Engine SHALL generate a condensed summary limited to 200 words containing only the top-level topic headings and their single-sentence core statements from the source note.
6. WHEN a student selects "Mind Map", THE AI_Engine SHALL generate a hierarchical mind map structure with a central topic, a maximum of 3 branching levels, and a maximum of 30 nodes total, rendered as a visual diagram that supports expand/collapse of branches and zoom in/out interactions.
7. WHEN a student selects "Flowchart", THE AI_Engine SHALL generate a step-by-step process flowchart with a maximum of 20 nodes for procedural content identified in the source note, rendered as a visual diagram that supports zoom in/out interactions.
8. WHEN a student selects "Concept Notes", THE AI_Engine SHALL generate concept-by-concept explanations for a maximum of 10 key concepts from the source note, with each concept containing a definition, an explanation, and at least one example, limited to 1500 words total.
9. THE AI_Engine SHALL generate any selected Summary_Mode within 20 seconds of the student's selection.
10. IF summary generation exceeds 20 seconds, THEN THE AI_Summaries_Tab SHALL display a timeout message indicating the generation took too long and provide a Retry button that re-triggers generation for the same note and selected mode.
11. IF the source note contains fewer than 50 words, THEN THE AI_Summaries_Tab SHALL display a message indicating the note has insufficient content for summary generation, without invoking the AI_Engine.
12. IF a student selects "Flowchart" and the source note contains no procedural or sequential content, THEN THE AI_Engine SHALL display a message indicating that no process flow could be identified in the note, and suggest selecting an alternative Summary_Mode.

### Requirement 11: AI Learning Tools for Summaries

**User Story:** As a student, I want AI-powered learning tools available for each summary, so that I can deepen my understanding through multiple learning approaches.

#### Acceptance Criteria

1. THE Summary_Card SHALL provide the following action buttons: Read Summary, Listen, Explain Like Beginner, Explain with Examples, Real Life Examples, Generate Quiz, Generate Flashcards, Generate Mnemonics, and Ask AI.
2. WHEN a student clicks "Read Summary", THE AI_Summaries_Tab SHALL display the full summary content in a reading view within 2 seconds.
3. WHEN a student clicks "Listen", THE AI_Engine SHALL display a loading indicator, generate text-to-speech audio of the summary, and begin playback within 10 seconds, providing pause, resume, and stop controls.
4. WHEN a student clicks "Explain Like Beginner", THE AI_Engine SHALL display a loading indicator and regenerate the summary content using simplified vocabulary, analogies, and sentences of no more than 20 words each, displayed within 15 seconds.
5. WHEN a student clicks "Explain with Examples", THE AI_Engine SHALL display a loading indicator and augment the summary with a minimum of 3 illustrative examples mapped to distinct concepts identified in the summary, displayed within 15 seconds.
6. WHEN a student clicks "Real Life Examples", THE AI_Engine SHALL display a loading indicator and generate a minimum of 3 real-world application examples for topics covered in the summary, displayed within 15 seconds.
7. WHEN a student clicks "Generate Quiz", THE AI_Engine SHALL display a loading indicator and generate between 5 and 10 multiple-choice questions based on the summary content within 15 seconds, each question having exactly 4 answer options with one correct answer indicated.
8. WHEN a student clicks "Generate Flashcards", THE AI_Engine SHALL display a loading indicator and generate between 5 and 15 flashcards based on the summary content within 15 seconds, each flashcard containing a front (question or term) and a back (answer or definition).
9. WHEN a student clicks "Generate Mnemonics", THE AI_Engine SHALL display a loading indicator and generate a minimum of 2 mnemonic devices for key facts, formulas, or lists identified in the summary within 10 seconds.
10. WHEN a student clicks "Ask AI", THE AI_Summaries_Tab SHALL open a contextual chat interface pre-loaded with the summary content as context within 3 seconds, allowing the student to type and submit follow-up questions.
11. IF any AI learning tool fails to generate content or does not respond within its specified time limit, THEN THE AI_Summaries_Tab SHALL display "Generation failed. Please try again." with a Retry button, and any previously displayed summary or generated content SHALL remain unchanged.
12. WHILE an AI learning tool is generating content, THE AI_Summaries_Tab SHALL disable the action buttons for other AI learning tools on the same Summary_Card until generation completes or fails.

### Requirement 12: Faculty Verification Display

**User Story:** As a student, I want to clearly see whether a summary is faculty-approved or AI-generated, so that I can gauge the reliability of the content.

#### Acceptance Criteria

1. THE Summary_Card SHALL display one of two verification states: "Faculty Approved" with a green checkmark badge, or "AI Generated" with the AI_Confidence percentage displayed as a whole number (between 60 and 99) followed by a percent sign. Both badges SHALL include a text label in addition to color so that the verification state is distinguishable without relying on color alone.
2. THE Summary_Service SHALL retrieve the verification status from the NoteSummary status field, where status "APPROVED" maps to "Faculty Approved" and statuses "DRAFT" or "UNDER_REVIEW" map to "AI Generated".
3. WHEN a summary status is "REJECTED", THE Summary_Card SHALL not display that summary to students.
4. THE AI_Engine SHALL compute AI_Confidence as a value between 60 and 99 based on the completeness of source material coverage and internal consistency scoring.
5. IF the NoteSummary status field contains a null or unrecognized value, THEN THE Summary_Card SHALL not display that summary to students.
6. IF the AI_Confidence value is not available for a summary with status "DRAFT" or "UNDER_REVIEW", THEN THE Summary_Card SHALL display the "AI Generated" badge without a confidence percentage, showing "Confidence pending" in place of the numeric value.

### Requirement 13: Weak Topic Summary Recommendations

**User Story:** As a student, I want AI-recommended summaries based on my weak topics, so that I can focus revision on areas where I need the most improvement.

#### Acceptance Criteria

1. THE AI_Summaries_Tab SHALL display a "Recommended for You" section listing up to 5 summaries covering topics from the student's weak_topics list aggregated across all of the student's StudentPerformanceSummary records for the current semester.
2. THE AI_Engine SHALL prioritize recommendations for topics where the student's per-topic accuracy (as computed from QuizAnswer records) is lowest, sorted ascending by accuracy percentage, and break ties alphabetically by topic name.
3. IF a student has no weak topics (all per-topic accuracies are above 60 percent), THEN THE "Recommended for You" section SHALL display "Great work! No weak topics detected. Keep revising to stay sharp."
4. IF a recommended summary does not yet exist for a weak topic and at least one note exists for that topic's subject, THEN THE AI_Summaries_Tab SHALL display a "Generate Summary" button that triggers AI summary generation for that topic's source note, displaying a loading indicator during generation and completing within 15 seconds.
5. IF the AI_Engine fails to load recommendations or does not respond within 5 seconds, THEN THE AI_Summaries_Tab SHALL display an error message indicating that recommendations are temporarily unavailable, along with a "Retry" button.
6. IF a weak topic has no associated note available for summarization, THEN THE AI_Summaries_Tab SHALL display that topic with a label indicating no source material is available and omit the "Generate Summary" button for that entry.
7. IF the AI_Engine fails to generate a summary after the student clicks "Generate Summary", THEN THE AI_Summaries_Tab SHALL display an error message indicating summary generation failed, along with a "Retry" button, without removing the topic from the recommendations list.

### Requirement 14: AI Revision Assistant

**User Story:** As a student, I want an AI revision assistant that plans and guides my revision sessions, so that I can study efficiently with structured time-based plans.

#### Acceptance Criteria

1. THE AI_Summaries_Tab SHALL display a Revision_Assistant side panel containing: a "Today's Revision" list of up to 5 summaries recommended for review today based on the student's weak topics and upcoming exam dates, the total estimated revision time in minutes (computed as the sum of individual summary Estimated Reading Times), and a "Start Revision" button.
2. THE Revision_Assistant SHALL provide the following Smart Revision Modes: "1 Hour Revision" (select summaries totaling no more than 60 minutes of estimated reading time), "Night Before Exam" (select summaries covering topics associated with questions from past exams for a specified subject), "7-Day Revision Plan" (distribute all summaries across 7 days with daily targets), "Important Topics Only" (select summaries covering topics where the proportion of past exam questions referencing that topic exceeds 70 percent of total exam questions for the subject), and "Expected Questions" (generate between 5 and 15 likely exam questions from summaries based on topic exam frequency).
3. WHEN a student selects "Night Before Exam" mode, THE Revision_Assistant SHALL prompt for subject selection and generate a prioritized revision list of up to 10 summaries sorted by topic exam frequency descending for that subject within 10 seconds.
4. WHEN a student selects "7-Day Revision Plan", THE Revision_Assistant SHALL generate a daily schedule distributing summaries across 7 days by estimated reading time, each day totaling no more than 90 minutes of estimated reading time, within 15 seconds.
5. WHEN a student clicks "Start Revision", THE Revision_Assistant SHALL navigate to the first summary in the revision list within 2 seconds and display a progress tracker showing the count of completed items, the count of remaining items, and the total number of items in the revision list.
6. IF the AI_Engine cannot generate a revision plan due to insufficient summary data (fewer than 3 summaries available for the selected criteria), THEN THE Revision_Assistant SHALL display "Not enough summaries available. Upload or generate more summaries to create a revision plan."
7. IF the AI_Engine fails to respond or returns an error when generating a revision plan or expected questions, THEN THE Revision_Assistant SHALL display an error message indicating the service is temporarily unavailable, along with a "Retry" button that re-requests plan generation from the AI_Engine.

### Requirement 15: Missing Summary Generation State

**User Story:** As a student, I want helpful options when no summary exists for a topic, so that I can generate AI content or request faculty assistance instead of seeing an empty page.

#### Acceptance Criteria

1. WHEN the AI_Summaries_Tab has no summaries matching the current filters or for the student's enrolled subjects, THE AI_Summaries_Tab SHALL display an empty state containing a message indicating that no faculty summary is available and that the student can generate an AI summary from uploaded notes.
2. WHILE the missing summary state is displayed, THE AI_Summaries_Tab SHALL display three action buttons: "Generate AI Summary" which triggers AI generation, "Ask AI Tutor" which opens the contextual AI chat, and "Request Faculty Summary" which sends a notification to the assigned faculty for that subject.
3. WHEN a student clicks "Generate AI Summary", THE AI_Engine SHALL select the uploaded note for the currently filtered subject and unit that has the most recent created_at timestamp, display a loading indicator, generate a summary within 20 seconds, and display the resulting Summary_Card in the AI_Summaries_Tab.
4. IF the AI_Engine fails to generate a summary within 20 seconds or returns an error when the student clicks "Generate AI Summary", THEN THE AI_Summaries_Tab SHALL display an error message indicating that summary generation failed, along with a "Retry" button, without navigating the student away from the missing summary state.
5. WHEN a student clicks "Request Faculty Summary", THE Note_Service SHALL create a faculty notification record containing the subject, unit, and requesting student information, and display a confirmation message indicating the request was sent to the faculty.
6. IF the Note_Service fails to create the faculty notification record, THEN THE AI_Summaries_Tab SHALL display an error message indicating the request could not be sent, along with a "Retry" button.
7. IF no uploaded notes exist for the currently filtered subject, THEN THE "Generate AI Summary" button SHALL be disabled with a tooltip indicating that no source notes are available for the selected subject.
8. IF the current filters include a unit and no uploaded notes exist for that specific subject and unit combination, THEN THE "Generate AI Summary" button SHALL be disabled with a tooltip indicating that no source notes are available for the selected unit.

### Requirement 16: AI Compare View

**User Story:** As a student, I want to compare original notes, AI summaries, and faculty summaries side by side, so that I can identify key differences and verify comprehensiveness.

#### Acceptance Criteria

1. THE AI_Summaries_Tab SHALL provide a "Compare" action button on each Summary_Card that opens a side-by-side comparison view.
2. THE Compare view SHALL display up to 3 panels: Original Note content (left), AI Summary (center), and Faculty Summary (right), with synchronized scrolling enabled so that scrolling one panel scrolls all panels at the same relative position.
3. WHEN only an AI Summary exists (no faculty summary for that note), THE Compare view SHALL display 2 panels: Original Note (left) and AI Summary (right).
4. WHEN only a Faculty Summary exists (no AI summary for that note), THE Compare view SHALL display 2 panels: Original Note (left) and Faculty Summary (right).
5. THE Compare view SHALL highlight key concepts that appear in the original note but are missing from a summary, displayed as underlined text in the original note panel, where key concepts are identified by the AI_Engine as terms or definitions that appear in the source but not in the corresponding summary.
6. WHEN a student closes the Compare view, THE AI_Summaries_Tab SHALL return to the previous summary list view preserving all active filters and scroll position.
7. IF the original note file cannot be loaded, THEN THE Compare view SHALL display an error message in the Original Note panel indicating the file is unavailable, while still displaying available summary panels.

### Requirement 17: Practice After Reading

**User Story:** As a student, I want practice questions presented after completing a summary, so that I can immediately test my understanding of the material.

#### Acceptance Criteria

1. WHEN a student finishes reading a summary (scrolls to at least 90 percent of the summary content height or clicks "Mark as Complete"), THE AI_Summaries_Tab SHALL display a Practice Section offering four practice types: Practice MCQs, Coding Questions, Theory Questions, and Previous Year Questions.
2. THE Practice Section SHALL provide a difficulty selector with options: Easy, Medium, and Hard, with "Medium" selected by default.
3. WHEN a student selects a practice type and difficulty and clicks the generate button, THE AI_Engine SHALL generate between 5 and 10 questions of the selected type and difficulty based on the content of the completed summary and display them within 15 seconds.
4. IF the AI_Engine generates fewer than 5 valid questions for the selected type and difficulty, THEN THE Practice Section SHALL display the available questions with a message indicating that fewer questions were generated than expected.
5. WHEN a student has submitted an answer for every question in the practice set, THE Practice Section SHALL display an accuracy score computed as (number of correct answers divided by total questions) multiplied by 100, displayed as a whole number percentage (0 to 100), along with a per-question indication of correct or incorrect.
6. WHEN a student submits an answer to an individual question, THE Practice Section SHALL indicate whether the submitted answer is correct or incorrect before the student proceeds to the next question.
7. IF the AI_Engine fails to generate practice questions within 15 seconds or returns an error, THEN THE Practice Section SHALL display "Unable to generate questions. Please try again." with a Retry button that re-requests generation using the same selected practice type and difficulty.

### Requirement 18: Performance-Based Next Steps

**User Story:** As a student, I want AI-suggested next steps after reading a summary, so that I know the optimal next action to reinforce my learning.

#### Acceptance Criteria

1. WHEN a student completes reading a summary (Reading_Progress reaches 100 percent for that summary), THE AI_Engine SHALL display a "Next Steps" recommendation within 5 seconds.
2. THE "Next Steps" recommendation SHALL include: the topic completed, a suggested practice activity specifying the question count (between 5 and 30) and question type (MCQ, Coding, Theory, or Previous Year Style), and an estimated improvement percentage (between 1 and 25 percent) computed from the student's QuizAttempt and QuizAnswer accuracy records for the completed topic within the current semester.
3. THE "Next Steps" section SHALL provide a button that navigates directly to the suggested practice activity with subject and topic from the completed summary pre-applied as filters in the Practice_Generator.
4. IF the student has no prior performance data for the completed topic (fewer than 3 QuizAnswer records for that topic), THEN THE AI_Engine SHALL suggest a practice activity of 10 MCQ questions at easy difficulty for the subject of the completed summary, without displaying an estimated improvement percentage.
5. IF the AI_Engine fails to generate a "Next Steps" recommendation within 5 seconds, THEN THE AI_Summaries_Tab SHALL display a message indicating that next steps are temporarily unavailable, along with a "Retry" button that re-requests the recommendation from the AI_Engine.

### Requirement 19: Smart Study Analytics

**User Story:** As a student, I want a study analytics overview at the top of the Notes page, so that I can track my engagement and identify study patterns.

#### Acceptance Criteria

1. THE Notes_Module SHALL display a Smart Analytics bar at the top of both tabs showing six metrics: Notes Read (count of notes with Reading_Progress at 100 percent, displayed as a whole number), AI Summaries Completed (count of summaries read to completion, displayed as a whole number), Total Study Time (sum of reading session durations from StudentActivityLog entries with action "note_read" for the current semester, displayed in "Xh Ym" format), Revision Completion percentage (completed revision items divided by total assigned items multiplied by 100, displayed as a whole number followed by percent sign; "N/A" when no revision items are assigned), Favorite Subject (subject with the highest note view count for the current semester; "N/A" when no notes have been viewed), and Weakest Subject (subject with the lowest average quiz accuracy from StudentPerformanceSummary for the current semester; "N/A" when no quiz data exists).
2. THE Activity_Service SHALL compute Total Study Time from StudentActivityLog entries with action "note_read" for the current semester, summing the duration_seconds field of each entry.
3. THE Smart Analytics bar SHALL update metric values each time the student navigates to the Notes_Module by re-fetching data from the Activity_Service and Performance_Service.
4. WHEN a student has no activity data for a numeric metric (Notes Read, AI Summaries Completed, Total Study Time), THE Smart Analytics bar SHALL display "0" for that metric.
5. WHEN multiple subjects are tied for Favorite Subject or Weakest Subject, THE Smart Analytics bar SHALL display the subject whose name comes first alphabetically.
6. IF the Activity_Service or Performance_Service fails to respond within 5 seconds, THEN THE Smart Analytics bar SHALL display "Unable to load analytics" with a "Retry" button, without preventing access to the rest of the Notes_Module content.

### Requirement 20: Floating AI Assistant

**User Story:** As a student, I want a floating AI assistant button available throughout the Notes module, so that I can access contextual AI tools without navigating away from my current view.

#### Acceptance Criteria

1. THE Notes_Module SHALL display a Floating_AI_Assistant button in the bottom-right corner of the viewport, visible on both tabs and persisting across page scrolling.
2. WHEN a student clicks the Floating_AI_Assistant button, THE Notes_Module SHALL expand a radial menu offering: "Ask About This Note", "Summarize Current File", "Generate Quiz", "Explain Diagram", "Create Flashcards", "Create Mind Map", "Translate", and "Voice Explanation".
3. WHEN a student clicks outside the expanded radial menu or presses the Escape key, THE Notes_Module SHALL collapse the menu back to the single Floating_AI_Assistant button.
4. WHEN a student selects "Ask About This Note" while viewing a note, THE Floating_AI_Assistant SHALL open a contextual chat interface with the current note's title and text content loaded as initial context for the AI_Engine conversation.
5. WHEN a student selects "Summarize Current File" while viewing a note, THE AI_Engine SHALL generate a summary of the currently open note and display it in a slide-over panel within 15 seconds.
6. WHEN a student selects "Generate Quiz", THE AI_Engine SHALL generate 5 multiple-choice questions with 4 options each from the currently viewed note content and display them in a modal within 15 seconds.
7. WHEN a student selects "Explain Diagram" while viewing a note that contains at least one image or diagram, THE AI_Engine SHALL generate a textual explanation of the first image or diagram on the currently visible page and display it in a slide-over panel within 15 seconds.
8. WHEN a student selects "Create Flashcards", THE AI_Engine SHALL generate between 5 and 10 flashcards from the currently viewed note content and display them in a modal overlay within 15 seconds.
9. WHEN a student selects "Create Mind Map", THE AI_Engine SHALL generate a mind map structure from the current note content and display it as a visual diagram with expandable and collapsible nodes within 20 seconds.
10. WHEN a student selects "Translate", THE Floating_AI_Assistant SHALL display a language selector listing a minimum of 5 supported languages; upon selection THE AI_Engine SHALL translate the currently viewed note summary into the chosen language and display the result within 20 seconds.
11. WHEN a student selects "Voice Explanation", THE AI_Engine SHALL generate a text-to-speech audio explanation of the current note content and begin playback within 10 seconds, with pause, resume, stop, and seek controls displayed.
12. WHEN no note is currently open and a student selects a context-dependent action ("Ask About This Note", "Summarize Current File", "Explain Diagram", "Generate Quiz", "Create Flashcards", "Create Mind Map", "Translate", or "Voice Explanation"), THE Floating_AI_Assistant SHALL display a message indicating the student must open a note first to use the selected action.
13. IF any Floating_AI_Assistant action fails to return a result within its specified time limit, THEN THE Notes_Module SHALL display an inline error message within the expanded menu indicating the action failed, along with a Retry button, without collapsing the menu or navigating the student away.
