import api from "./api"

/**
 * chatbotService — wraps all /chatbot/* endpoints
 */

/**
 * Send a message to the AI tutor.
 * @param {string} message
 * @param {string} subject  - DSA | DBMS | OS | CN | JAVA | PYTHON
 * @param {string} language - english | hindi | auto
 * @param {Array}  conversationHistory - [{role, content}, ...]
 * @param {string|null} pdfContext - extracted text from uploaded PDF
 */
export async function sendMessage(message, subject, language, conversationHistory = [], pdfContext = null) {
  const payload = {
    message,
    subject,
    language,
    conversation_history: conversationHistory.slice(-10),
  }
  if (pdfContext) {
    payload.pdf_context = pdfContext
  }
  const { data } = await api.post("/chatbot/chat", payload)
  return data // { id, response, suggested_topic, subject, language, confidence_level, provider_used }
}

/**
 * Flag an AI answer as incorrect.
 * @param {string} chatLogId 
 * @param {string} flagReason 
 */
export async function flagAnswer(chatLogId, flagReason) {
  const { data } = await api.post("/chatbot/flag", {
    chat_log_id: chatLogId,
    flag_reason: flagReason,
  })
  return data
}

/**
 * Fetch the last 30 days of chat logs for the student.
 * @param {string|null} subject Filter by subject code
 */
export async function getChatHistory(subject = null) {
  const params = new URLSearchParams()
  if (subject) params.append("subject", subject)
  const { data } = await api.get(`/chatbot/history?${params.toString()}`)
  return data
}

/**
 * Upload a PDF and extract its text on the backend.
 * @param {File} file - the PDF File object
 * @returns {{ text: string, pages: number, filename: string }}
 */
export async function uploadPdf(file) {
  const formData = new FormData()
  formData.append("file", file)
  const { data } = await api.post("/chatbot/extract-pdf", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data
}

let cachedSubjects = null;
/** Fetch the list of supported MCA subjects with colours & topics. */
export async function getSubjects() {
  if (cachedSubjects) return cachedSubjects;
  const { data } = await api.get("/chatbot/subjects")
  cachedSubjects = data;
  return data
}

let cachedProviderStatus = null;
/** Fetch AI provider status (which keys are configured). */
export async function getProviderStatus() {
  if (cachedProviderStatus) return cachedProviderStatus;
  const { data } = await api.get("/chatbot/provider-status")
  cachedProviderStatus = data;
  return data
}

/** Admin: Fetch flagged answers */
export async function getFlaggedAnswers(status = "pending") {
  const { data } = await api.get(`/chatbot/admin/flagged-answers?status=${status}`)
  return data
}

/** Admin: Review flagged answer */
export async function reviewFlaggedAnswer(flagId, status, adminNote = "") {
  const { data } = await api.patch(`/chatbot/admin/flagged-answers/${flagId}`, {
    status,
    admin_note: adminNote,
  })
  return data
}
