import React, { useState } from "react"
import { BookOpen, AlertTriangle } from "lucide-react"

function getCellStyles(accuracy) {
  if (accuracy === null || accuracy === undefined) {
    return {
      row: "dash-bg-subtle",
      text: "dash-text-muted",
      bold: "dash-text-muted",
    }
  }
  if (accuracy < 50)  return { row: "bg-red-500/10 hover:bg-red-500/20 cursor-pointer",     text: "text-red-500",     bold: "text-red-600"     }
  if (accuracy < 65)  return { row: "bg-orange-500/10 hover:bg-orange-500/20 cursor-pointer", text: "text-orange-500",  bold: "text-orange-600"  }
  if (accuracy < 75)  return { row: "bg-yellow-500/10 hover:bg-yellow-500/20 cursor-pointer", text: "text-yellow-600",  bold: "text-yellow-700"  }
  return               { row: "bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer",    text: "text-emerald-500", bold: "text-emerald-600" }
}

export default function PerformanceHeatmap({ data = [], isLoading = false, onCellClick }) {
  const [hoveredCell, setHoveredCell] = useState(null)

  const handleMouseEnter = (e, subject, unitKey, info) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setHoveredCell({
      subjectId: subject.subject_id,
      subjectCode: subject.subject_code,
      subjectName: subject.subject_name,
      unitKey,
      info,
      x: rect.left + window.scrollX + rect.width / 2,
      y: rect.top + window.scrollY - 10,
    })
  }

  return (
    <div className="dash-card relative">
      {/* Header */}
      <div className="dash-card-header">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-bold font-outfit dash-text-primary">Subject-wise Unit Performance Heatmap</h2>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs font-semibold dash-text-secondary">
          {[
            { label: '< 50%',   cls: 'bg-red-500/20'     },
            { label: '50–64%',  cls: 'bg-orange-500/20'  },
            { label: '65–74%',  cls: 'bg-yellow-500/20'  },
            { label: '≥ 75%',   cls: 'bg-emerald-500/20' },
            { label: 'No Data', cls: 'dash-bg-subtle'     },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded border dash-border ${l.cls}`} />
              <span>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5">
        <p className="text-xs dash-text-muted mb-4">
          Aggregated quiz correctness per subject per unit. Hover for detailed metrics; click to view weak students.
        </p>

        {isLoading ? (
          <div className="h-56 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <p className="dash-text-muted text-sm font-medium">Aggregating class metrics…</p>
          </div>
        ) : data.length === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center text-center p-6 dash-bg-subtle rounded-xl border dash-border border-dashed">
            <AlertTriangle className="w-9 h-9 text-yellow-500/70 mb-3" />
            <p className="dash-text-primary font-semibold">No Performance Records Found</p>
            <p className="dash-text-muted text-xs mt-1 max-w-sm">
              Adjust your semester or date filters, or verify that quiz attempts have been submitted.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border dash-border">
            <table className="w-full border-collapse text-left min-w-[680px]">
              <thead>
                <tr className="dash-bg-subtle border-b dash-border text-xs font-bold dash-text-muted uppercase tracking-wider">
                  <th className="py-3 px-4 min-w-[180px]">Subject</th>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <th key={i} className="py-3 px-2 text-center w-28">Unit {i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y dash-border text-sm">
                {data.map(subject => (
                  <tr key={subject.subject_id} className="hover:dash-bg-subtle transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold dash-text-primary">{subject.subject_code}</div>
                      <div className="dash-text-muted text-xs mt-0.5 font-medium">{subject.subject_name}</div>
                    </td>
                    {Array.from({ length: 5 }).map((_, i) => {
                      const unitKey = `Unit ${i + 1}`
                      const info    = subject.units[unitKey] || { accuracy: null, attempts: 0 }
                      const hasData = info.accuracy !== null
                      const styles  = getCellStyles(info.accuracy)
                      return (
                        <td
                          key={i}
                          onClick={() => hasData && onCellClick?.(subject.subject_id, subject.subject_code, subject.subject_name, unitKey)}
                          onMouseEnter={e => handleMouseEnter(e, subject, unitKey, info)}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`py-3 px-2 text-center transition-all duration-200 border-l dash-border first:border-l-0 rounded-sm ${styles.row}`}
                        >
                          {hasData ? (
                            <div className={`font-bold text-sm select-none ${styles.text}`}>
                              {info.accuracy.toFixed(1)}%
                              <div className={`text-[10px] opacity-70 font-semibold mt-0.5 ${styles.text}`}>
                                {info.attempts} att
                              </div>
                            </div>
                          ) : (
                            <span className="dash-text-muted font-semibold text-xs">N/A</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Floating Tooltip */}
        {hoveredCell && hoveredCell.info.accuracy !== null && (
          <div
            style={{
              position: 'fixed',
              left: hoveredCell.x - 160,
              top:  hoveredCell.y - 180,
              zIndex: 9999,
            }}
            className="w-[320px] bg-white dark:bg-slate-950 border dash-border rounded-2xl shadow-2xl p-4 text-xs pointer-events-none animate-fade-in"
          >
            <div className="flex items-center justify-between border-b dash-border pb-2 mb-2.5">
              <div>
                <span className="font-bold text-blue-500">{hoveredCell.subjectCode}</span>
                <span className="dash-text-muted mx-1.5">·</span>
                <span className="dash-text-primary font-bold">{hoveredCell.unitKey}</span>
              </div>
              <div className={`px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider ${
                hoveredCell.info.accuracy >= 75 ? "bg-emerald-500/20 text-emerald-600" :
                hoveredCell.info.accuracy >= 65 ? "bg-yellow-500/20 text-yellow-600"  :
                hoveredCell.info.accuracy >= 50 ? "bg-orange-500/20 text-orange-600"  :
                "bg-red-500/20 text-red-600"
              }`}>
                {hoveredCell.info.accuracy.toFixed(1)}% ACCURACY
              </div>
            </div>
            <div className="space-y-2 font-medium">
              <div className="flex justify-between">
                <span className="dash-text-secondary">Attempts:</span>
                <span className="dash-text-primary font-bold">{hoveredCell.info.attempts}</span>
              </div>
              <div className="flex justify-between">
                <span className="dash-text-secondary">Common Wrong:</span>
                <span className="text-red-500 font-bold">{hoveredCell.info.common_wrong_answer}</span>
              </div>
              {hoveredCell.info.recommended_action && (
                <div className="border-t dash-border pt-2 mt-2">
                  <div className="text-[9px] font-bold dash-text-muted uppercase tracking-wider mb-1">Recommended Action</div>
                  <div className="dash-text-secondary leading-relaxed dash-bg-subtle border dash-border rounded-lg p-2 text-[11px]">
                    {hoveredCell.info.recommended_action}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
