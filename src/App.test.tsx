// Constitution: UI is smoke-tested (renders, key interactions work).

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  window.localStorage.clear();
});

describe('App', () => {
  it('renders without crashing and shows the calendar shell', () => {
    render(<App />);
    expect(screen.getByText('Sprout')).toBeInTheDocument();
    expect(screen.getByText('Up next')).toBeInTheDocument();
    expect(screen.getByText('＋ Add assignment')).toBeInTheDocument();
  });

  it('toggles between Month and Agenda views', () => {
    render(<App />);
    expect(screen.getAllByText('Sun').length).toBeGreaterThan(0); // month grid visible
    fireEvent.click(screen.getByText('Agenda'));
    expect(screen.queryAllByText('Sun').length).toBe(0); // month grid gone
  });

  it('adds a new assignment via the modal (story 4)', () => {
    render(<App />);
    fireEvent.click(screen.getByText('＋ Add assignment'));
    fireEvent.change(screen.getByLabelText('What is it?'), {
      target: { value: 'Chemistry Final' },
    });
    fireEvent.click(screen.getByText('Save assignment'));
    fireEvent.click(screen.getByText('Agenda'));
    const agenda = document.querySelector('.agenda') as HTMLElement;
    expect(within(agenda).getByText('Chemistry Final')).toBeInTheDocument();
  });

  it('does not save an assignment with no title', () => {
    render(<App />);
    fireEvent.click(screen.getByText('＋ Add assignment'));
    fireEvent.click(screen.getByText('Save assignment'));
    expect(screen.getByText(/Give it a title and a due date/)).toBeInTheDocument();
  });
});
