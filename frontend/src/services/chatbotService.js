import api from "./api"

/**
 * chatbotService — wraps all /chatbot/* endpoints
 */

/**
 * Send a message to the AI tutor.
 * @param {string} message
 * @param {string} subject  - DSA | DBMS | OS | CN | JAVA | PYTHON
 * @param {string} language - english | hindi
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
  return data // { response, suggested_topic, subject, language, provider_used }
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

/** Fetch the list of supported MCA subjects with colours & topics. */
export async function getSubjects() {
  const { data } = await api.get("/chatbot/subjects")
  return data
}

/** Fetch the last 20 chat logs for the authenticated student. */
export async function getChatHistory() {
  const { data } = await api.get("/chatbot/history")
  return data
}

/** Fetch AI provider status (which keys are configured). */
export async function getProviderStatus() {
  const { data } = await api.get("/chatbot/provider-status")
  return data
}
