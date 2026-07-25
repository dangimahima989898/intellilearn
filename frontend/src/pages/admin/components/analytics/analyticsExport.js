import toast from 'react-hot-toast'
import api from '../../../../services/api'

// Helper to calculate average unit accuracy
function calcAvg(row) {
  const units = [row.u1, row.u2, row.u3, row.u4, row.u5].filter(v => v !== null && v !== undefined)
  if (units.length === 0) return 0
  return Math.round(units.reduce((a, b) => a + b, 0) / units.length)
}

// ── Excel Export: Heatmap ─────────────────────────────────────────────────────
export async function exportHeatmapExcel(deptFilter) {
  try {
    const XLSX = await import('xlsx')
    const response = await api.get('/api/v1/hod/analytics/heatmap')
    const heatmapData = response.data || {}
    const rows = [['Department', 'Subject', 'Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5', 'AVG']]
    const depts = deptFilter !== 'All' ? [deptFilter] : Object.keys(heatmapData)
    depts.forEach(dept => {
      heatmapData[dept]?.forEach(row => {
        rows.push([dept, row.subject, row.u1, row.u2, row.u3, row.u4, row.u5, calcAvg(row)])
      })
    })
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 10 }, { wch: 24 }, ...Array(6).fill({ wch: 10 })]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Heatmap')
    XLSX.writeFile(wb, `heatmap_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Heatmap exported as Excel')
  } catch (err) {
    console.error(err)
    toast.error('Failed to export Heatmap')
  }
}

// ── Excel Export: Missed Questions ────────────────────────────────────────────
export async function exportMissedQuestionsExcel(deptFilter) {
  try {
    const XLSX = await import('xlsx')
    const response = await api.get('/api/v1/hod/analytics/missed-questions')
    const missedQuestions = response.data || []
    const headers = ['Question', 'Subject', 'Department', 'Unit', 'Difficulty', 'Wrong Attempts', 'Total Attempts', 'Error Rate %']
    const rows = [headers]
    missedQuestions.filter(q => deptFilter === 'All' || q.department === deptFilter).forEach(q => {
      rows.push([q.question, q.subject, q.department, q.unit, q.difficulty, q.wrong_attempts, q.attempts, q.error_rate])
    })
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 60 }, { wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 12 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Missed Questions')
    XLSX.writeFile(wb, `missed_questions_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Missed Questions exported as Excel')
  } catch (err) {
    console.error(err)
    toast.error('Failed to export Missed Questions')
  }
}

// ── Excel Export: Student Performance ────────────────────────────────────────
export async function exportStudentPerformanceExcel(deptFilter) {
  try {
    const XLSX = await import('xlsx')
    const response = await api.get('/api/v1/hod/analytics/student-progress')
    const studentList = response.data || []
    const headers = ['Student Name', 'Enrollment', 'Department', 'Semester', 'Avg Score %', 'Change %', 'Quizzes Taken', 'Status']
    const rows = [headers]
    studentList.filter(s => deptFilter === 'All' || s.dept === deptFilter).forEach(s => {
      rows.push([s.name, s.enrollment, s.dept, s.sem, s.avg_score, s.change, s.quizzes, s.status.toUpperCase()])
    })
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 10 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Student Performance')
    XLSX.writeFile(wb, `student_performance_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Student Performance exported as Excel')
  } catch (err) {
    console.error(err)
    toast.error('Failed to export Student Performance')
  }
}

// ── PDF Export: Full Department Report ───────────────────────────────────────
export async function exportFullReportPDF(deptFilter) {
  try {
    const [heatmapRes, missedRes] = await Promise.all([
      api.get('/api/v1/hod/analytics/heatmap'),
      api.get('/api/v1/hod/analytics/missed-questions')
    ])
    const heatmapData = heatmapRes.data || {}
    const missedQuestions = missedRes.data || []

    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const W = 210
    const purple = [124, 58, 237]
    const textGray = [80, 80, 100]
    let y = 20

    // Header
    doc.setFillColor(...purple)
    doc.rect(0, 0, W, 18, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(255, 255, 255)
    doc.text('IntelliLearn — Department Analytics Report', W / 2, 12, { align: 'center' })

    y = 26
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...textGray)
    doc.text(`Department: ${deptFilter === 'All' ? 'All Departments' : deptFilter}   |   Generated: ${new Date().toLocaleDateString('en-IN')}`, W / 2, y, { align: 'center' })

    // Section: Heatmap Summary
    y += 10
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(40, 40, 60)
    doc.text('1. Quiz Accuracy Summary (Department-wise)', 15, y)
    y += 6

    const depts = deptFilter !== 'All' ? [deptFilter] : Object.keys(heatmapData)
    depts.forEach(dept => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...purple)
      doc.text(dept, 15, y)
      y += 4

      heatmapData[dept]?.slice(0, 3).forEach(row => {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(...textGray)
        const avg = calcAvg(row)
        doc.text(`  ${row.subject}: U1=${row.u1 ?? '-'}% U2=${row.u2 ?? '-'}% U3=${row.u3 ?? '-'}% U4=${row.u4 ?? '-'}% U5=${row.u5 ?? '-'}% | Avg=${avg}%`, 18, y)
        y += 4
        if (y > 270) { doc.addPage(); y = 20 }
      })
      y += 2
    })

    // Section: Missed Questions
    y += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(40, 40, 60)
    doc.text('2. Most Commonly Missed Questions', 15, y)
    y += 6

    missedQuestions.filter(q => deptFilter === 'All' || q.department === deptFilter).slice(0, 5).forEach((q, i) => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(60, 60, 80)
      const qLines = doc.splitTextToSize(`${i + 1}. ${q.question}`, W - 30)
      doc.text(qLines, 15, y)
      y += qLines.length * 4

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...textGray)
      doc.text(`   Subject: ${q.subject} | Dept: ${q.department} | Error Rate: ${q.error_rate}%`, 15, y)
      y += 6
      if (y > 270) { doc.addPage(); y = 20 }
    })

    // Footer
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(160, 160, 180)
      doc.text(`IntelliLearn · Confidential · Page ${i} of ${pageCount}`, W / 2, 290, { align: 'center' })
    }

    doc.save(`department_report_${new Date().toISOString().slice(0, 10)}.pdf`)
    toast.success('Full report exported as PDF')
  } catch (err) {
    console.error('PDF export failed', err)
    toast.error('Failed to generate PDF. Please try again.')
  }
}
