import { Routes, Route, Navigate } from 'react-router-dom'

// Placeholder pages — will be replaced in later steps
const Placeholder = ({ name }) => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-4xl font-outfit font-bold text-brand mb-2">IntelliLearn</h1>
      <p className="text-navy-600">{name} — Coming in later steps</p>
    </div>
  </div>
)

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Placeholder name="Home Page" />} />
      <Route path="/login" element={<Placeholder name="Login Page" />} />
      <Route path="/register" element={<Placeholder name="Register Page" />} />
      <Route path="/admin/*" element={<Placeholder name="Admin Dashboard" />} />
      <Route path="/student/*" element={<Placeholder name="Student Dashboard" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
