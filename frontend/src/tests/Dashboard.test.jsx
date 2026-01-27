import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import { AuthProvider } from '../contexts/AuthContext';
import api from '../utils/api';

vi.mock('../utils/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const renderDashboard = (userRole = 'employee') => {
  const mockUser = {
    id: userRole === 'manager' ? 1 : 2,
    email: 'test@test.com',
    role: userRole,
  };
  
  Storage.prototype.getItem = vi.fn((key) => {
    if (key === 'token') return 'fake-token';
    if (key === 'user') return JSON.stringify(mockUser);
    return null;
  });

  return render(
    <BrowserRouter>
      <AuthProvider>
        <Dashboard user={mockUser} />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render manager dashboard', async () => {
    const mockStats = {
      team_size: 10,
      active_checkins: 5,
      today_checkins: [],
    };
    api.get.mockResolvedValue({ data: { success: true, data: mockStats } });

    renderDashboard('manager');

    await waitFor(() => {
      expect(screen.getByText(/manager dashboard/i)).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });

  it('should call manager stats endpoint', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: { team_size: 0, active_checkins: 0, today_checkins: [] } } });

    renderDashboard('manager');

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/dashboard/stats');
    });
  });

  it('should render employee dashboard', async () => {
    const mockEmployeeData = {
      assigned_clients: [],
      week_stats: { total_checkins: 10 },
      today_checkins: [],
    };
    api.get.mockResolvedValue({ data: { success: true, data: mockEmployeeData } });

    renderDashboard('employee');

    await waitFor(() => {
      expect(screen.getByText(/my dashboard/i)).toBeInTheDocument();
    });
  });

  it('should call employee endpoint', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: { assigned_clients: [], week_stats: {}, today_checkins: [] } } });

    renderDashboard('employee');

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/dashboard/employee');
    });
  });

  it('should show loading state', () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    renderDashboard('manager');

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should display error message', async () => {
    api.get.mockRejectedValue({
      response: { data: { error: 'Failed' } },
    });

    renderDashboard('manager');

    await waitFor(() => {
      expect(screen.getByText(/failed to load dashboard/i)).toBeInTheDocument();
    });
  });

  it('should render activity list for managers', async () => {
    const mockStats = {
      team_size: 10,
      active_checkins: 5,
      today_checkins: [
        { id: 1, employee_name: 'John Doe', client_name: 'Client A', checkin_time: new Date().toISOString(), status: 'checked_in' },
      ],
    };
    api.get.mockResolvedValue({ data: { success: true, data: mockStats } });

    renderDashboard('manager');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('should render client list for employees', async () => {
    const mockEmployeeData = {
      assigned_clients: [
        { id: 1, name: 'Client A', address: '123 Main St' },
      ],
      week_stats: { total_checkins: 10 },
      today_checkins: [],
    };
    api.get.mockResolvedValue({ data: { success: true, data: mockEmployeeData } });

    renderDashboard('employee');

    await waitFor(() => {
      expect(screen.getByText('Client A')).toBeInTheDocument();
    });
  });
});
