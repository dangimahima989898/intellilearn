/**
 * HubLayout — reusable tab-bar wrapper for consolidated hub pages.
 *
 * Props:
 *   tabs: [{ id, label, icon: LucideIcon, badge? }]
 *   activeTab: string  (controlled by parent via URL ?tab=)
 *   onTabChange: (id: string) => void
 *   children: React node (the content of the active tab)
 */
import React from 'react'

export default function HubLayout({ tabs = [], activeTab, onTabChange, children }) {
  return (
    <div className="flex flex-col h-full">
      {/* ── Tab Bar ────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-6 border-b dash-border overflow-x-auto pb-0 shrink-0">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold
                border-b-2 transition-all duration-150 whitespace-nowrap cursor-pointer shrink-0
                ${isActive
                  ? 'border-brand text-brand'
                  : 'border-transparent dash-text-muted hover:dash-text-primary hover:border-brand/40'}
              `}
            >
              {tab.icon && <tab.icon className="w-4 h-4" />}
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span className={`
                  text-[10px] font-extrabold px-1.5 py-0.5 rounded-full
                  ${isActive
                    ? 'bg-brand/20 text-brand'
                    : 'bg-red-500/20 text-red-500 animate-pulse'}
                `}>
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  )
}
