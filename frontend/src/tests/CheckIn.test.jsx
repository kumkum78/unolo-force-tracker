/* global global */import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CheckIn from '../pages/CheckIn';
import { AuthProvider } from '../contexts/AuthContext';
import api from '../utils/api';

// Mock the API module
vi.mock('../utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
};
global.navigator.geolocation = mockGeolocation;

const renderCheckIn = () => {
  // Mock localStorage
  Storage.prototype.getItem = vi.fn((key) => {
    if (key === 'token') return 'fake-token';
    if (key === 'user') return JSON.stringify({ id: 1, email: 'test@test.com', role: 'employee' });
    return null;
  });

  const mockUser = { id: 1, email: 'test@test.com', role: 'employee' };

  return render(
    <BrowserRouter>
      <AuthProvider>
        <CheckIn user={mockUser} />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('CheckIn Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render check-in page', async () => {
    api.get.mockResolvedValueOnce({ data: { success: true, data: [] } });
    api.get.mockResolvedValueOnce({ data: { success: true, data: null } });
    
    renderCheckIn();

    await waitFor(() => {
      expect(screen.getByText(/check in \/ out/i)).toBeInTheDocument();
    });
  });

  it('should load clients on mount', async () => {
    const mockClients = [
      { id: 1, name: 'Client A', address: 'Address A' },
    ];
    api.get.mockResolvedValueOnce({ data: { success: true, data: mockClients } });
    api.get.mockResolvedValueOnce({ data: { success: true, data: null } });

    renderCheckIn();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/checkin/clients');
    });
  });

  it('should get location automatically on mount', async () => {
    api.get.mockResolvedValueOnce({ data: { success: true, data: [] } });
    api.get.mockResolvedValueOnce({ data: { success: true, data: null } });
    
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: { latitude: 12.9716, longitude: 77.5946 },
      });
    });

    renderCheckIn();

    await waitFor(() => {
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
    });
  });

  it('should display active check-in when exists', async () => {
    const mockActiveCheckin = {
      id: 1,
      client_name: 'Client A',
      checkin_time: new Date().toISOString(),
    };
    
    api.get.mockResolvedValueOnce({ data: { success: true, data: [] } });
    api.get.mockResolvedValueOnce({ data: { success: true, data: mockActiveCheckin } });

    renderCheckIn();

    await waitFor(() => {
      expect(screen.getByText(/active check-in/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /check out/i })).toBeInTheDocument();
    });
  });

  it('should show check-in form when no active check-in', async () => {
    api.get.mockResolvedValueOnce({ data: { success: true, data: [] } });
    api.get.mockResolvedValueOnce({ data: { success: true, data: null } });

    renderCheckIn();

    await waitFor(() => {
      expect(screen.getByLabelText(/select client/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /check in/i })).toBeInTheDocument();
    });
  });

  it('should submit check-in successfully', async () => {
    const mockClients = [
      { id: 1, name: 'Client A', address: 'Address A' },
    ];
    api.get.mockResolvedValueOnce({ data: { success: true, data: mockClients } });
    api.get.mockResolvedValueOnce({ data: { success: true, data: null } });
    api.post.mockResolvedValue({ data: { success: true } });
    api.get.mockResolvedValueOnce({ data: { success: true, data: mockClients } });
    api.get.mockResolvedValueOnce({ data: { success: true, data: null } });

    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: { latitude: 12.9716, longitude: 77.5946 },
      });
    });

    renderCheckIn();

    await waitFor(() => {
      const select = screen.getByLabelText(/select client/i);
      fireEvent.change(select, { target: { value: '1' } });
    });

    await waitFor(() => {
      const submitBtn = screen.getByRole('button', { name: /check in/i });
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/checkin', expect.any(Object));
    });
  });

  it('should handle checkout', async () => {
    const mockActiveCheckin = {
      id: 1,
      client_name: 'Client A',
      checkin_time: new Date().toISOString(),
    };
    
    api.get.mockResolvedValueOnce({ data: { success: true, data: [] } });
    api.get.mockResolvedValueOnce({ data: { success: true, data: mockActiveCheckin } });
    api.put.mockResolvedValue({ data: { success: true } });

    renderCheckIn();

    await waitFor(() => {
      const checkoutBtn = screen.getByRole('button', { name: /check out/i });
      fireEvent.click(checkoutBtn);
    });

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/checkin/checkout');
    });
  });

  it('should display error on check-in failure', async () => {
    const mockClients = [{ id: 1, name: 'Client A' }];
    api.get.mockResolvedValueOnce({ data: { success: true, data: mockClients } });
    api.get.mockResolvedValueOnce({ data: { success: true, data: null } });
    api.post.mockRejectedValue({
      response: { data: { message: 'Already checked in' } },
    });

    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: { latitude: 12.9716, longitude: 77.5946 },
      });
    });

    renderCheckIn();

    await waitFor(() => {
      const select = screen.getByLabelText(/select client/i);
      fireEvent.change(select, { target: { value: '1' } });
    });

    await waitFor(() => {
      const submitBtn = screen.getByRole('button', { name: /check in/i });
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(screen.getByText(/already checked in/i)).toBeInTheDocument();
    });
  });

  it('should disable submit when location not available', async () => {
    api.get.mockResolvedValueOnce({ data: { success: true, data: [] } });
    api.get.mockResolvedValueOnce({ data: { success: true, data: null } });
    mockGeolocation.getCurrentPosition.mockImplementation(() => {});

    renderCheckIn();

    await waitFor(() => {
      const submitBtn = screen.getByRole('button', { name: /check in/i });
      expect(submitBtn).toBeDisabled();
    });
  });

  it('should display location when available', async () => {
    api.get.mockResolvedValueOnce({ data: { success: true, data: [] } });
    api.get.mockResolvedValueOnce({ data: { success: true, data: null } });
    
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: { latitude: 12.9716, longitude: 77.5946 },
      });
    });

    renderCheckIn();

    await waitFor(() => {
      expect(screen.getByText(/12\.971600/)).toBeInTheDocument();
    });
  });
});
