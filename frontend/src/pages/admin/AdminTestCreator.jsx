import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Upload, Trash2, FileText, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react'
import placementService from '../../services/placementService'
import toast from 'react-hot-toast'

export default function AdminTestCreator() {
  const navigate = useNavigate()

  // Step state
  const [step, setStep] = useState(1) // 1: metadata, 2: questions manager
  const [testId, setTestId] = useState(null)

  // Test Metadata Form State
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Engineering')
  const [testType, setTestType] = useState('mixed')
  const [duration, setDuration] = useState(60)
  const [difficulty, setDifficulty] = useState('medium')
  const [description, setDescription] = useState('')
  const [totalMarks, setTotalMarks] = useState(100)

  // Question Creation Form State
  const [qText, setQText] = useState('')
  const [qType, setQType] = useState('mcq')
  const [qOptions, setQOptions] = useState(['', '', '', ''])
  const [qCorrect, setQCorrect] = useState('')
  const [qStarter, setQStarter] = useState('')
  const [qExpected, setQExpected] = useState('')
  const [qMarks, setQMarks] = useState(10)
  const [qSection, setQSection] = useState('General')
  const [qOrder, setQOrder] = useState(1)

  // CSV Import State
  const [csvFile, setCsvFile] = useState(null)
  const [csvErrors, setCsvErrors] = useState([])
  const [isImporting, setIsImporting] = useState(false)

  // Questions Count
  const [questionsCount, setQuestionsCount] = useState(0)

  // Handlers
  const handleCreateTest = async (e) => {
    e.preventDefault()
    if (!title) {
      toast.error("Please enter a test title")
      return
    }

    try {
      const payload = {
        title,
        category,
        test_type: testType,
        duration_minutes: duration,
        difficulty,
        description,
        total_marks: totalMarks
      }
      const data = await placementService.adminCreateTest(payload)
      setTestId(data.id)
      setStep(2)
      toast.success("Test metadata saved successfully!")
    } catch (error) {
      toast.error("Failed to create placement test")
    }
  }

  const handleAddQuestion = async (e) => {
    e.preventDefault()
    if (!qText || !qCorrect) {
      toast.error("Please fill in question text and correct answer")
      return
    }

    try {
      const payload = {
        question_text: qText,
        question_type: qType,
        correct_answer: qCorrect,
        marks: qMarks,
        section: qSection,
        order_index: qOrder
      }

      if (qType === 'mcq') {
        payload.options = qOptions.filter(o => o.trim() !== '')
      } else if (qType === 'coding') {
        payload.starter_code = qStarter
        payload.expected_output = qExpected
      }

      await placementService.adminCreateQuestion(testId, payload)
      toast.success("Question added successfully!")
      setQuestionsCount(prev => prev + 1)

      // Reset question fields (except section and order index auto-increment)
      setQText('')
      setQCorrect('')
      setQStarter('')
      setQExpected('')
      setQOrder(prev => prev + 1)
      setQOptions(['', '', '', ''])
    } catch (error) {
      toast.error("Failed to add question to test")
    }
  }

  const handleCSVUpload = async (e) => {
    e.preventDefault()
    if (!csvFile) {
      toast.error("Please select a structured CSV file first")
      return
    }

    setIsImporting(true)
    setCsvErrors([])

    try {
      const res = await placementService.adminImportCSV(testId, csvFile)
      toast.success(res.message || "CSV questions imported successfully!")
      navigate('/tests')
    } catch (error) {
      const errDetail = error.response?.data?.detail
      if (errDetail && errDetail.errors) {
        setCsvErrors(errDetail.errors)
        toast.error("CSV validation failed with warnings.")
      } else {
        toast.error("Failed to parse or upload CSV questions")
      }
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
          <button 
            onClick={() => navigate('/tests')}
            className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold font-outfit">Create Placement Assessment</h1>
            <p className="text-white/60 text-xs mt-0.5">Define metadata, upload files, and configure aptitude or coding simulators.</p>
          </div>
        </div>

        {/* Step 1: Metadata Form */}
        {step === 1 && (
          <form onSubmit={handleCreateTest} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
            <h2 className="text-lg font-bold font-outfit border-b border-white/5 pb-2">1. Test Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs uppercase tracking-wider font-extrabold text-white/50">Test Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Software Engineer Assessment"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-extrabold text-white/50">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0E1628] border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Analytics">Analytics</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-extrabold text-white/50">Test Type</label>
                <select
                  value={testType}
                  onChange={(e) => setTestType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0E1628] border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                >
                  <option value="mixed">Mixed</option>
                  <option value="aptitude">Aptitude</option>
                  <option value="coding">Coding challenge</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-extrabold text-white/50">Duration (Minutes)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-extrabold text-white/50">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0E1628] border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-extrabold text-white/50">Total Marks</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs uppercase tracking-wider font-extrabold text-white/50">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide a summary of the test rules, target roles, or modules assessed..."
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>

            </div>

            <div className="border-t border-white/5 pt-4 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-505 text-sm font-extrabold rounded-lg transition-colors"
              >
                Save and Continue
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Manage Questions & CSV Upload */}
        {step === 2 && (
          <div className="space-y-6">
            
            {/* CSV Bulk Import Section */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold font-outfit border-b border-white/5 pb-2 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-400" />
                Bulk Question Import (CSV)
              </h2>
              
              <div className="bg-[#0E1628]/50 border border-white/5 rounded-xl p-4 text-xs space-y-1">
                <div className="font-bold text-white/60">Required Headers:</div>
                <code className="text-blue-400">question_text, question_type, options, correct_answer, starter_code, expected_output, marks, section, order_index</code>
                <div className="text-white/40 mt-2">Format options as a comma-separated list or JSON array: `["A", "B", "C"]`</div>
              </div>

              <form onSubmit={handleCSVUpload} className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="w-full space-y-2">
                  <label className="text-xs uppercase tracking-wider font-extrabold text-white/50">Select CSV file</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files[0])}
                    className="w-full text-sm text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-extrabold file:bg-blue-600/10 file:text-blue-400 hover:file:bg-blue-600/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isImporting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-extrabold transition-colors shrink-0 disabled:opacity-50"
                >
                  {isImporting ? "Importing..." : "Upload CSV"}
                </button>
              </form>

              {/* CSV Validation Error Report */}
              {csvErrors.length > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 space-y-2 text-sm text-rose-400">
                  <div className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> CSV Validation Errors:</div>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-white/80">
                    {csvErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Manual Single Question Creator */}
            <form onSubmit={handleAddQuestion} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
              <h2 className="text-lg font-bold font-outfit border-b border-white/5 pb-2 flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                Add Question Manually
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs uppercase tracking-wider font-extrabold text-white/50">Question Text</label>
                  <textarea
                    required
                    rows={3}
                    value={qText}
                    onChange={(e) => setQText(e.target.value)}
                    placeholder="Enter question content (Markdown syntax is supported)..."
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider font-extrabold text-white/50">Question Type</label>
                  <select
                    value={qType}
                    onChange={(e) => setQType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0E1628] border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                  >
                    <option value="mcq">MCQ</option>
                    <option value="fill">Fill in the Blank</option>
                    <option value="coding">Coding challenge</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider font-extrabold text-white/50">Section</label>
                  <input
                    type="text"
                    required
                    value={qSection}
                    onChange={(e) => setQSection(e.target.value)}
                    placeholder="e.g. Aptitude, Logical Reasoning, Coding"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider font-extrabold text-white/50">Marks</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={qMarks}
                    onChange={(e) => setQMarks(parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider font-extrabold text-white/50">Order Index</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={qOrder}
                    onChange={(e) => setQOrder(parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>

                {/* Conditional Fields: MCQ Options */}
                {qType === 'mcq' && (
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-xs uppercase tracking-wider font-extrabold text-white/50">Radio Options</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {qOptions.map((opt, idx) => (
                        <input
                          key={idx}
                          type="text"
                          required
                          value={opt}
                          onChange={(e) => {
                            const nextOpts = [...qOptions]
                            nextOpts[idx] = e.target.value
                            setQOptions(nextOpts)
                          }}
                          placeholder={`Option ${idx + 1}`}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Conditional Fields: Coding */}
                {qType === 'coding' && (
                  <>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs uppercase tracking-wider font-extrabold text-white/50">Starter Code</label>
                      <textarea
                        rows={4}
                        value={qStarter}
                        onChange={(e) => setQStarter(e.target.value)}
                        placeholder="def function_name(args):&#10;    # Starter signature template"
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl font-mono text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs uppercase tracking-wider font-extrabold text-white/50">Expected Output</label>
                      <input
                        type="text"
                        value={qExpected}
                        onChange={(e) => setQExpected(e.target.value)}
                        placeholder="Output of sample test case validation"
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs uppercase tracking-wider font-extrabold text-white/50">Correct Answer</label>
                  <input
                    type="text"
                    required
                    value={qCorrect}
                    onChange={(e) => setQCorrect(e.target.value)}
                    placeholder="Provide the exact matching string for automated grading"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-sm font-semibold"
                  />
                </div>

              </div>

              <div className="border-t border-white/5 pt-4 flex justify-between items-center">
                <span className="text-xs text-white/50">
                  Total Questions Added: <strong className="text-amber-400">{questionsCount}</strong>
                </span>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-[#0A0F1E] text-sm font-extrabold rounded-lg transition-colors"
                  >
                    Add Question
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/tests')}
                    className="px-6 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Finish and Go to Catalog
                  </button>
                </div>
              </div>
            </form>

          </div>
        )}

      </div>
    </div>
  )
}
