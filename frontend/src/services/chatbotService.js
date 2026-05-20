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
 */
export async function sendMessage(message, subject, language, conversationHistory = []) {
  const { data } = await api.post("/chatbot/chat", {
    message,
    subject,
    language,
    conversation_history: conversationHistory.slice(-10),
  })
  return data // { response, suggested_topic, subject, language, provider_used }
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
