// Constitution: UI is smoke-tested (renders, key interactions work).
// The API layer is mocked so these tests never hit the network — identity
// resolution and server-store logic have their own dedicated unit tests
// (lib/identity.test.ts, server/store.test.ts).

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from './App';
import * as api from './lib/api';
import type { UserData } from './types/userData';

vi.mock('./lib/api', () => ({
  createIdentity: vi.fn(),
  fetchUserData: vi.fn(),
  saveUserData: vi.fn(),
}));

const TEST_ID = 'test-user-0000';

function freshUserData(): UserData {
  return {
    id: TEST_ID,
    name: null,
    classes: [],
    assignments: [],
    onboardingDismissed: false,
    linkNoticeDismissed: true, // keep the link banner out of the way for UI tests
    pushSubscription: null,
    timeZone: 'America/New_York', // pre-set so the auto-detect effect is a no-op in most tests
    updatedAt: new Date().toISOString(),
  };
}

function readyUserData(): UserData {
  return { ...freshUserData(), onboardingDismissed: true };
}

beforeEach(() => {
  // Pre-seed the identity cookie so useIdentity resolves without needing
  // createIdentity — keeps these tests focused on UI behavior.
  document.cookie = `sprout_uid=${TEST_ID}; Max-Age=315360000; Path=/`;
  vi.mocked(api.saveUserData).mockImplementation(async (id, input) => ({
    id,
    updatedAt: new Date().toISOString(),
    ...input,
  }));
});

describe('App', () => {
  it('renders the calendar shell once identity/data resolve', async () => {
    vi.mocked(api.fetchUserData).mockResolvedValue(readyUserData());
    render(<App />);
    expect(await screen.findByText('Sprout')).toBeInTheDocument();
    expect(screen.getByText('Up next')).toBeInTheDocument();
    expect(screen.getByText('＋ Add assignment')).toBeInTheDocument();
  });

  it('shows a generic greeting with no name, and an empty agenda with no seed data', async () => {
    vi.mocked(api.fetchUserData).mockResolvedValue(readyUserData());
    render(<App />);
    expect(await screen.findByText('Welcome 🌱')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Agenda'));
    expect(screen.getByText(/Nothing on the horizon/)).toBeInTheDocument();
  });

  it('shows a personalized greeting once a name is set', async () => {
    vi.mocked(api.fetchUserData).mockResolvedValue({ ...readyUserData(), name: 'Julia' });
    render(<App />);
    expect(await screen.findByText('Hey Julia 👋')).toBeInTheDocument();
  });

  it('toggles between Month and Agenda views', async () => {
    vi.mocked(api.fetchUserData).mockResolvedValue(readyUserData());
    render(<App />);
    await screen.findByText('Sprout');
    expect(screen.getAllByText('Sun').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText('Agenda'));
    expect(screen.queryAllByText('Sun').length).toBe(0);
  });

  it('onboarding is fully skippable and never blocks adding an assignment (story 9)', async () => {
    vi.mocked(api.fetchUserData).mockResolvedValue(freshUserData());
    render(<App />);
    expect(await screen.findByText('Welcome to Sprout 🌱')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Skip for now'));
    expect(screen.queryByText('Welcome to Sprout 🌱')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('＋ Add assignment'));
    fireEvent.change(screen.getByLabelText('What is it?'), {
      target: { value: 'Chemistry Final' },
    });
    fireEvent.click(screen.getByText('Save assignment'));
    fireEvent.click(screen.getByText('Agenda'));
    const agenda = document.querySelector('.agenda') as HTMLElement;
    expect(within(agenda).getByText('Chemistry Final')).toBeInTheDocument();
  });

  it('does not save an assignment with no title', async () => {
    vi.mocked(api.fetchUserData).mockResolvedValue(readyUserData());
    render(<App />);
    fireEvent.click(await screen.findByText('＋ Add assignment'));
    fireEvent.click(screen.getByText('Save assignment'));
    expect(screen.getByText(/Give it a title and a due date/)).toBeInTheDocument();
  });

  it('edits an existing assignment (story 8)', async () => {
    const withAssignment: UserData = {
      ...readyUserData(),
      assignments: [
        {
          id: 'a1',
          title: 'Old title',
          classId: null,
          dueDate: '2099-01-01',
          type: 'other',
          done: false,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    vi.mocked(api.fetchUserData).mockResolvedValue(withAssignment);
    render(<App />);
    fireEvent.click(await screen.findByText('Agenda'));
    const agenda = document.querySelector('.agenda') as HTMLElement;
    fireEvent.click(within(agenda).getByText('Old title'));
    expect(await screen.findByText('Edit assignment')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('What is it?'), {
      target: { value: 'New title' },
    });
    fireEvent.click(screen.getByText('Save changes'));
    expect(await within(agenda).findByText('New title')).toBeInTheDocument();
    expect(within(agenda).queryByText('Old title')).not.toBeInTheDocument();
  });

  it('deletes an assignment via the two-click confirm (story 8)', async () => {
    const withAssignment: UserData = {
      ...readyUserData(),
      assignments: [
        {
          id: 'a1',
          title: 'Delete me',
          classId: null,
          dueDate: '2099-01-01',
          type: 'other',
          done: false,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    vi.mocked(api.fetchUserData).mockResolvedValue(withAssignment);
    render(<App />);
    fireEvent.click(await screen.findByText('Agenda'));
    const agenda = document.querySelector('.agenda') as HTMLElement;
    fireEvent.click(within(agenda).getByText('Delete me'));
    await screen.findByText('Edit assignment');
    fireEvent.click(screen.getByText('Delete'));
    fireEvent.click(screen.getByText('Confirm delete?'));
    expect(screen.queryByText('Delete me')).not.toBeInTheDocument();
  });

  it('marks an assignment complete, archiving it out of Agenda, then restores it (story 5/13, v5)', async () => {
    const withAssignment: UserData = {
      ...readyUserData(),
      assignments: [
        {
          id: 'a1',
          title: 'Finish reading',
          classId: null,
          dueDate: '2099-01-01',
          type: 'other',
          done: false,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    vi.mocked(api.fetchUserData).mockResolvedValue(withAssignment);
    render(<App />);
    fireEvent.click(await screen.findByText('Agenda'));
    const check = screen.getByLabelText('Mark "Finish reading" complete');
    fireEvent.click(check);

    // gone from the live Agenda entirely, not just struck-through
    expect(screen.queryByText('Finish reading')).not.toBeInTheDocument();
    expect(screen.getByText('Completed (1) →')).toBeInTheDocument();

    // reachable from the Archive, with a way back
    fireEvent.click(screen.getByText('Completed (1) →'));
    expect(await screen.findByText('Finish reading')).toBeInTheDocument();
    fireEvent.click(screen.getByText('↺ Restore'));
    expect(screen.queryByText('Finish reading')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Calendar'));
    fireEvent.click(screen.getByText('Agenda'));
    const agenda = document.querySelector('.agenda') as HTMLElement;
    expect(await within(agenda).findByText('Finish reading')).toBeInTheDocument();
  });

  it('adds, renames, and deletes a class from the Classes tab (story 7)', async () => {
    vi.mocked(api.fetchUserData).mockResolvedValue(readyUserData());
    render(<App />);
    fireEvent.click(await screen.findByText('Classes'));
    expect(await screen.findByText('Your classes')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Add a class'), {
      target: { value: 'BIO 201' },
    });
    fireEvent.click(screen.getByText('+ Add'));
    expect(await screen.findByText('BIO 201')).toBeInTheDocument();

    fireEvent.click(screen.getByText('BIO 201'));
    const renameInput = screen.getByDisplayValue('BIO 201');
    fireEvent.change(renameInput, { target: { value: 'BIO 202' } });
    fireEvent.blur(renameInput);
    expect(await screen.findByText('BIO 202')).toBeInTheDocument();

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(screen.getByText('Confirm?'));
    expect(screen.queryByText('BIO 202')).not.toBeInTheDocument();
  });

  it('settings links to the Classes tab instead of duplicating class management (story 7)', async () => {
    vi.mocked(api.fetchUserData).mockResolvedValue(readyUserData());
    render(<App />);
    fireEvent.click(await screen.findByLabelText('Open settings'));
    expect(await screen.findByText('Settings')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Go to Classes →'));
    expect(await screen.findByText('Your classes')).toBeInTheDocument();
  });

  it('clicking a day cell opens the add-assignment modal with that date pre-filled (story 2/4)', async () => {
    vi.mocked(api.fetchUserData).mockResolvedValue(readyUserData());
    render(<App />);
    await screen.findByText('Sprout');
    const todayCell = document.querySelector('.day-cell.today') as HTMLElement;
    fireEvent.click(todayCell);
    expect(await screen.findByText('Add an assignment')).toBeInTheDocument();
    const dateInput = screen.getByLabelText('Due date') as HTMLInputElement;
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(dateInput.value).toBe(expected);
  });

  it('the + Add assignment button still opens the modal with no date pre-filled beyond today (story 4)', async () => {
    vi.mocked(api.fetchUserData).mockResolvedValue(readyUserData());
    render(<App />);
    fireEvent.click(await screen.findByText('＋ Add assignment'));
    expect(await screen.findByText('Add an assignment')).toBeInTheDocument();
    const dateInput = screen.getByLabelText('Due date') as HTMLInputElement;
    expect(dateInput.value).toBe(new Date().toISOString().slice(0, 10));
  });

  it('broadened type list includes the new preset types (story 4)', async () => {
    vi.mocked(api.fetchUserData).mockResolvedValue(readyUserData());
    render(<App />);
    fireEvent.click(await screen.findByText('＋ Add assignment'));
    await screen.findByText('Add an assignment');
    // Type options render as "<icon> <label>" (v5's icon+label legend
    // shares that same shape), so scope to just the type picker and check
    // substrings rather than exact text to avoid ambiguity with the
    // Month-view legend underneath.
    const optionTexts = Array.from(document.querySelectorAll('.type-opt')).map((el) => el.textContent ?? '');
    for (const label of [
      'Quiz',
      'Homework / Assignment',
      'Presentation',
      'Lab',
      'Exam',
      'Reading',
      'Problem Set',
    ]) {
      expect(optionTexts.some((t) => t.includes(label))).toBe(true);
    }
  });

  it('the Tasks nav item is gone (v4)', async () => {
    vi.mocked(api.fetchUserData).mockResolvedValue(readyUserData());
    render(<App />);
    await screen.findByText('Sprout');
    expect(screen.queryByText('Tasks')).not.toBeInTheDocument();
    // Grades remains as the one disabled placeholder
    expect(screen.getByText('Grades')).toBeInTheDocument();
  });

  it('the month/year picker jumps directly to a chosen month (story 2, v4)', async () => {
    vi.mocked(api.fetchUserData).mockResolvedValue(readyUserData());
    render(<App />);
    await screen.findByText('Sprout');
    const monthLabelBtn = document.querySelector('.month-label-btn') as HTMLElement;
    fireEvent.click(monthLabelBtn);
    const monthSelect = screen.getByLabelText('Month') as HTMLSelectElement;
    fireEvent.change(monthSelect, { target: { value: '0' } });
    expect(monthLabelBtn.textContent).toContain('January');
  });

  it('the Today button returns to the current month after navigating away (story 2, v4)', async () => {
    vi.mocked(api.fetchUserData).mockResolvedValue(readyUserData());
    render(<App />);
    await screen.findByText('Sprout');
    const now = new Date();
    fireEvent.click(screen.getByLabelText('Next month'));
    fireEvent.click(screen.getByLabelText('Next month'));
    fireEvent.click(document.querySelector('.today-btn') as HTMLElement);
    const monthLabelBtn = document.querySelector('.month-label-btn') as HTMLElement;
    expect(monthLabelBtn.textContent).toContain(String(now.getFullYear()));
  });

  it('swiping left on the calendar grid moves to the next month (story 2, v4)', async () => {
    vi.mocked(api.fetchUserData).mockResolvedValue(readyUserData());
    render(<App />);
    await screen.findByText('Sprout');
    const grid = document.querySelector('.calendar-grid') as HTMLElement;
    const monthLabelBtn = document.querySelector('.month-label-btn') as HTMLElement;
    const before = monthLabelBtn.textContent;
    fireEvent.touchStart(grid, { touches: [{ clientX: 300 }] });
    fireEvent.touchEnd(grid, { changedTouches: [{ clientX: 200 }] });
    expect(monthLabelBtn.textContent).not.toBe(before);
  });

  it('settings offers an Enable notifications action (story 12)', async () => {
    vi.mocked(api.fetchUserData).mockResolvedValue(readyUserData());
    render(<App />);
    fireEvent.click(await screen.findByLabelText('Open settings'));
    expect(await screen.findByText('Reminders')).toBeInTheDocument();
    expect(screen.getByText('Enable notifications')).toBeInTheDocument();
  });

  it('fails soft with a clear message when the browser has no Push support (story 12)', async () => {
    vi.mocked(api.fetchUserData).mockResolvedValue(readyUserData());
    render(<App />);
    fireEvent.click(await screen.findByLabelText('Open settings'));
    fireEvent.click(await screen.findByText('Enable notifications'));
    expect(await screen.findByText(/doesn't support push notifications/)).toBeInTheDocument();
  });

  it('the Archive nav item is reachable and shows an empty state with nothing completed (story 13, v5)', async () => {
    vi.mocked(api.fetchUserData).mockResolvedValue(readyUserData());
    render(<App />);
    fireEvent.click(await screen.findByText('Archive'));
    expect(await screen.findByText('Everything you finish lands here.')).toBeInTheDocument();
    expect(screen.getByText(/Nothing archived yet/)).toBeInTheDocument();
  });

  it('assigning a class a preset color reflects on its Month chip and Agenda icon (story 7, v5)', async () => {
    const withAssignment: UserData = {
      ...readyUserData(),
      classes: [{ id: 'c1', name: 'BIO 201' }],
      assignments: [
        {
          id: 'a1',
          title: 'Lab report',
          classId: 'c1',
          dueDate: new Date().toISOString().slice(0, 10),
          type: 'lab',
          done: false,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    vi.mocked(api.fetchUserData).mockResolvedValue(withAssignment);
    render(<App />);

    // Before choosing a color, the chip falls back to the neutral default.
    await screen.findByText('Sprout');
    expect(document.querySelector('.day-chip.class-color-default')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Classes'));
    await screen.findByText('BIO 201');
    fireEvent.click(screen.getByLabelText("Set BIO 201's color to Sky"));

    fireEvent.click(screen.getByText('Calendar'));
    expect(await screen.findByText('Sprout')).toBeInTheDocument();
    expect(document.querySelector('.day-chip.class-color-sky')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Agenda'));
    expect(document.querySelector('.a-icon.class-color-sky')).toBeInTheDocument();
  });

  it('Study Timer renders a countdown and toggles start/pause (story 10)', async () => {
    vi.mocked(api.fetchUserData).mockResolvedValue(readyUserData());
    render(<App />);
    fireEvent.click(await screen.findByText('Study Timer'));
    expect(await screen.findByText('25:00')).toBeInTheDocument();
    expect(document.querySelector('.timer-cycle-count')?.textContent).toMatch(
      /0 focus cycles completed/,
    );
    fireEvent.click(screen.getByText('Start'));
    expect(await screen.findByText('Pause')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Pause'));
    expect(await screen.findByText('Start')).toBeInTheDocument();
  });
});
