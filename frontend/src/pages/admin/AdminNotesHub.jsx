/**
 * AdminNotesHub — unified Notes page with 4 tabs:
 *   browse | upload | review | analytics
 *
 * URL: /admin/notes?tab=browse (default)
 */
import { useSearchParams } from 'react-router-dom'
import { FileText, Upload, UserCheck, BarChart3 } from 'lucide-react'
import PageWrapper from '../../components/PageWrapper'
import HubLayout from '../../components/HubLayout'
import NotesPage from './NotesPage'
import NoteUpload from './NoteUpload'
import FacultyReviewPanel from './FacultyReviewPanel'
import AdminNotesAnalytics from './AdminNotesAnalytics'

const TABS = [
  { id: 'browse',    label: 'Browse Notes',     icon: FileText   },
  { id: 'upload',    label: 'Upload',            icon: Upload     },
  { id: 'review',    label: 'AI Summary Review', icon: UserCheck  },
  { id: 'analytics', label: 'Analytics',         icon: BarChart3  },
]

export default function AdminNotesHub() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'browse'

  const handleTabChange = (id) => {
    setSearchParams({ tab: id }, { replace: true })
  }

  return (
    <PageWrapper>
      <div className="mb-5 mt-1 md:mt-2">
        <h1 className="text-2xl font-outfit font-bold dash-text-primary tracking-tight">Notes & Materials</h1>
        <p className="text-sm dash-text-muted mt-0.5">Browse, upload and manage all course notes and AI-generated summaries.</p>
      </div>

      <HubLayout tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange}>
        {/* Each child page is rendered without its own PageWrapper/title since HubLayout provides framing */}
        {activeTab === 'browse'    && <NotesContentOnly />}
        {activeTab === 'upload'    && <UploadContentOnly />}
        {activeTab === 'review'    && <ReviewContentOnly />}
        {activeTab === 'analytics' && <AnalyticsContentOnly />}
      </HubLayout>
    </PageWrapper>
  )
}

// ── Thin wrappers that render each page's inner content directly ──────────────
// We import the full page components and rely on their own layout, but strip
// the outer PageWrapper title if they have one (they each render inside HubLayout now).

function NotesContentOnly() {
  return <NotesPage embedded />
}
function UploadContentOnly() {
  return <NoteUpload embedded />
}
function ReviewContentOnly() {
  return <FacultyReviewPanel embedded />
}
function AnalyticsContentOnly() {
  return <AdminNotesAnalytics embedded />
}
