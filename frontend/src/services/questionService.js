import api from "./api"

/**
 * questionService — wraps all /questions/* endpoints
 */

/**
 * Generate multiple choice questions.
 * @param {string} subjectCode
 * @param {string} topic
 * @param {string} difficulty - easy | medium | hard
 * @param {number} count - 1 to 10
 */
export async function generateQuestions(subjectCode, topic, difficulty, count) {
  const { data } = await api.post("/questions/generate", {
    subject_code: subjectCode,
    topic,
    difficulty,
    count,
  })
  return data // { questions: [...], generated_count, subject, topic, difficulty }
}

/**
 * Submit answers to a practice set.
 * @param {Array<string>} questionIds
 * @param {Array<{question_id: string, selected_answer: string}>} answers
 */
export async function submitPractice(questionIds, answers) {
  const { data } = await api.post("/questions/practice-submit", {
    question_ids: questionIds,
    answers,
  })
  return data // { results: [...], score, correct_count, total }
}

/**
 * Retrieve questions with optional filters.
 * @param {object} filters - { subject_id, difficulty, topic, page, size }
 */
export async function getQuestions(filters = {}) {
  const { data } = await api.get("/questions/", { params: filters })
  return data
}

export default {
  generateQuestions,
  submitPractice,
  getQuestions,
}
