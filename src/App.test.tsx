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

  it('marks an assignment complete via the agenda checkbox', async () => {
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
    expect(screen.getByLabelText('Mark "Finish reading" incomplete')).toBeInTheDocument();
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
    expect(await screen.findByText('Quiz')).toBeInTheDocument();
    expect(screen.getByText('Homework / Assignment')).toBeInTheDocument();
    expect(screen.getByText('Presentation')).toBeInTheDocument();
    expect(screen.getByText('Lab')).toBeInTheDocument();
    // existing types are still present, unrenamed at the value level
    expect(screen.getByText('Exam')).toBeInTheDocument();
    expect(screen.getByText('Reading')).toBeInTheDocument();
    expect(screen.getByText('Problem Set')).toBeInTheDocument();
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
