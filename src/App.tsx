// Traces to spec.md stories 1-9. Wires identity resolution, server-backed
// data, and all CRUD UI together.

import { useEffect, useState } from 'react';
import './styles/tokens.css';
import './styles/app.css';
import { Sidebar } from './components/Sidebar';
import type { PageKey } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { UpNextStrip } from './components/UpNextStrip';
import { ViewToggle } from './components/ViewToggle';
import type { ViewMode } from './components/ViewToggle';
import { MonthGrid } from './components/MonthGrid';
import { AgendaList } from './components/AgendaList';
import { AssignmentModal } from './components/AssignmentModal';
import { OnboardingModal } from './components/OnboardingModal';
import { SettingsModal } from './components/SettingsModal';
import { LinkSaveBanner } from './components/LinkSaveBanner';
import { ClassesPage } from './components/ClassesPage';
import { ArchivePage } from './components/ArchivePage';
import { StudyTimer } from './components/StudyTimer';
import { useIdentity } from './hooks/useIdentity';
import { useUserData } from './hooks/useUserData';
import type { Assignment } from './types/assignment';
import { ASSIGNMENT_TYPE_META } from './types/assignment';
import { privateUrl } from './lib/identity';

// v5: chip/icon backgrounds now reflect class color, not type (see story
// 7) — this legend switches from a color-dot-per-type to an icon+label
// legend, derived directly from ASSIGNMENT_TYPE_META so it can't drift
// out of sync with the actual type list.
const TYPE_LEGEND = Object.entries(ASSIGNMENT_TYPE_META).map(([key, meta]) => ({
  key,
  icon: meta.icon,
  label: meta.label,
}));

function App() {
  const { id } = useIdentity();
  const {
    data,
    loading,
    setName,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    toggleComplete,
    addClass,
    renameClass,
    deleteClass,
    setClassColor,
    dismissOnboarding,
    dismissLinkNotice,
    setPushSubscription,
    setTimeZone,
  } = useUserData(id);

  const [page, setPage] = useState<PageKey>('calendar');
  const [view, setView] = useState<ViewMode>('month');
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [defaultDueDate, setDefaultDueDate] = useState<string | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  // Story 12: captured invisibly, once, the first time we see a record with
  // no timezone set yet — no UI, no prompt (constitution.md: "nothing is
  // ever required"). Self-guarding: once set, data.timeZone is no longer
  // null and this becomes a no-op.
  useEffect(() => {
    if (data && data.timeZone == null) {
      setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
  }, [data, setTimeZone]);

  if (!id || loading || !data) {
    return (
      <div className="app-shell">
        <div className="loading-screen">🌱</div>
      </div>
    );
  }

  const isFreshIdentity =
    !data.name && data.classes.length === 0 && data.assignments.length === 0;
  const showOnboarding = isFreshIdentity && !data.onboardingDismissed;
  const archivedCount = data.assignments.filter((a) => a.done).length;

  const openAddModal = (dateStr?: string) => {
    setEditingAssignment(null);
    setDefaultDueDate(dateStr);
    setAssignmentModalOpen(true);
  };

  const openEditModal = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setAssignmentModalOpen(true);
  };

  return (
    <div className="app-shell">
      <Sidebar page={page} onNavigate={setPage} archivedCount={archivedCount} />
      <div className="main">
        <Topbar
          name={data.name}
          onAddClick={() => openAddModal()}
          onAvatarClick={() => setSettingsOpen(true)}
        />

        {!data.linkNoticeDismissed && (
          <LinkSaveBanner url={privateUrl(id)} onDismiss={dismissLinkNotice} />
        )}

        {page === 'calendar' && (
          <>
            <UpNextStrip assignments={data.assignments} classes={data.classes} />

            <div className="board">
              <div className="board-toolbar">
                <ViewToggle view={view} onChange={setView} />
              </div>

              {view === 'month' && (
                <div className="legend">
                  {TYPE_LEGEND.map((item) => (
                    <div className="legend-item" key={item.key}>
                      {item.icon} {item.label}
                    </div>
                  ))}
                </div>
              )}

              {view === 'month' ? (
                <MonthGrid
                  assignments={data.assignments}
                  classes={data.classes}
                  month={month}
                  year={year}
                  onMonthChange={(m, y) => {
                    setMonth(m);
                    setYear(y);
                  }}
                  onSelectAssignment={openEditModal}
                  onAddOnDate={openAddModal}
                />
              ) : (
                <AgendaList
                  assignments={data.assignments}
                  classes={data.classes}
                  onToggleComplete={toggleComplete}
                  onSelectAssignment={openEditModal}
                  onOpenArchive={() => setPage('archive')}
                />
              )}
            </div>
          </>
        )}

        {page === 'classes' && (
          <ClassesPage
            classes={data.classes}
            assignments={data.assignments}
            onAddClass={addClass}
            onRenameClass={renameClass}
            onDeleteClass={deleteClass}
            onSetClassColor={setClassColor}
          />
        )}

        {page === 'archive' && (
          <ArchivePage
            assignments={data.assignments}
            classes={data.classes}
            onRestore={toggleComplete}
            onSelectAssignment={openEditModal}
          />
        )}

        {page === 'timer' && (
          <StudyTimer notificationsEnabled={data.pushSubscription !== null} />
        )}
      </div>

      <AssignmentModal
        open={assignmentModalOpen}
        assignment={editingAssignment}
        classes={data.classes}
        defaultDueDate={defaultDueDate}
        onClose={() => setAssignmentModalOpen(false)}
        onSave={addAssignment}
        onUpdate={updateAssignment}
        onDelete={deleteAssignment}
      />

      <OnboardingModal
        open={showOnboarding}
        onSkip={dismissOnboarding}
        onSave={(name, classNames) => {
          if (name) setName(name);
          for (const c of classNames) addClass(c);
          dismissOnboarding();
        }}
      />

      <SettingsModal
        open={settingsOpen}
        name={data.name}
        privateUrl={privateUrl(id)}
        pushSubscribed={data.pushSubscription !== null}
        onClose={() => setSettingsOpen(false)}
        onSaveName={setName}
        onGoToClasses={() => setPage('classes')}
        onSetPushSubscription={setPushSubscription}
      />
    </div>
  );
}

export default App;
