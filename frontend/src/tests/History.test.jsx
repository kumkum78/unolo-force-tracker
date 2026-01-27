import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import History from '../pages/History';
import { AuthProvider } from '../contexts/AuthContext';
import api from '../utils/api';

vi.mock('../utils/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const renderHistory = () => {
  Storage.prototype.getItem = vi.fn((key) => {
    if (key === 'token') return 'fake-token';
    if (key === 'user') return JSON.stringify({ id: 1, email: 'test@test.com', role: 'employee' });
    return null;
  });

  const mockUser = { id: 1, email: 'test@test.com', role: 'employee' };

  return render(
    <BrowserRouter>
      <AuthProvider>
        <History user={mockUser} />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('History Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render history page', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: [] } });

    renderHistory();

    await waitFor(() => {
      const headings = screen.getAllByText(/check-in history/i);
      expect(headings.length).toBeGreaterThan(0);
    });
  });

  it('should load history on mount', async () => {
    const mockHistory = [
      {
        id: 1,
        client_name: 'Client A',
        checkin_time: '2024-01-15T09:00:00Z',
        checkout_time: '2024-01-15T17:00:00Z',
      },
    ];
    api.get.mockResolvedValue({ data: { success: true, data: mockHistory } });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('Client A')).toBeInTheDocument();
    });
  });

  it('should show empty state', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: [] } });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText(/total check-ins/i)).toBeInTheDocument();
    });
  });

  it('should display error', async () => {
    api.get.mockRejectedValue({
      response: { data: { error: 'Failed' } },
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText(/failed to load history/i)).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    renderHistory();

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should render filter form', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: [] } });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
    });
  });

  it('should filter by date', async () => {
    api.get.mockResolvedValueOnce({ data: { success: true, data: [] } });

    renderHistory();

    await waitFor(() => {
      const startDateInput = screen.getByLabelText(/start date/i);
      fireEvent.change(startDateInput, { target: { value: '2024-01-15' } });
    });

    api.get.mockResolvedValueOnce({ data: { success: true, data: [] } });

    await waitFor(() => {
      const filterBtn = screen.getByRole('button', { name: /filter/i });
      fireEvent.click(filterBtn);
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/checkin/history?start_date=2024-01-15');
    });
  });
});
