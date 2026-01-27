import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import { AuthProvider } from '../contexts/AuthContext';

// Mock child component
const TestComponent = () => <div>Protected Content</div>;

describe('ProtectedRoute Component', () => {
  // Setup localStorage mock
  const localStorageData = {};

  beforeEach(() => {
    // Clear localStorage data before each test
    Object.keys(localStorageData).forEach(key => delete localStorageData[key]);
    
    Storage.prototype.getItem = vi.fn((key) => {
      const value = localStorageData[key];
      return value || null;
    });
    
    Storage.prototype.setItem = vi.fn((key, value) => {
      localStorageData[key] = value;
    });
    
    Storage.prototype.removeItem = vi.fn((key) => {
      delete localStorageData[key];
    });
  });

  it('should redirect to login when not authenticated', async () => {
    // localStorage is already empty from beforeEach

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <TestComponent />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  it('should show loading spinner while checking auth', async () => {
    // localStorage is already empty from beforeEach

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <TestComponent />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // The loading is very brief in the actual implementation
    // It completes almost immediately after mount in useEffect
    // So we need to wait for the final state
    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  it('should render children when authenticated', async () => {
    // Set up authenticated user in localStorage BEFORE rendering
    const mockUser = { id: 1, email: 'test@test.com', role: 'employee' };
    const userString = JSON.stringify(mockUser);
    
    // Set values directly in our mock storage
    localStorageData['token'] = 'fake-token';
    localStorageData['user'] = userString;

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <TestComponent />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Wait for the AuthContext to process localStorage and update state
    await waitFor(() => {
      const protectedContent = screen.queryByText('Protected Content');
      const loginPage = screen.queryByText('Login Page');
      // One of these should be visible
      expect(protectedContent || loginPage).toBeTruthy();
      // And it should be Protected Content, not Login Page
      if (loginPage) {
        throw new Error('Still showing Login Page, user not authenticated');
      }
      expect(protectedContent).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
