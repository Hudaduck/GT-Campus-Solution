import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import React from 'react';
import { BrandProvider } from '../../shared/config/brandConfig';
import { Repository, DEMO_STUDENT_USER, INITIAL_CURRENT_USER } from '../../shared/data/repository';
import { AuthProvider, useAuth, DemoRoleSwitcher, OnboardingModal } from './index';

// Helper wrapper providing BrandProvider and AuthProvider using React.createElement
const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(BrandProvider, null, React.createElement(AuthProvider, null, children));
};

describe('Auth Module - useAuth & Dual Verification', () => {
  beforeEach(() => {
    Repository.resetAllData();
  });

  it('initializes with default current user from repository', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    expect(result.current.user).toBeDefined();
    expect(result.current.role).toBe(INITIAL_CURRENT_USER.role);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('switches role between student and alumni seamlessly and updates repository', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    // Switch to student
    act(() => {
      result.current.switchRole('student');
    });
    expect(result.current.role).toBe('student');
    expect(result.current.isStudent).toBe(true);
    expect(result.current.isAlum).toBe(false);
    expect(result.current.user.name).toBe(DEMO_STUDENT_USER.name);
    expect(Repository.getCurrentUser().role).toBe('student');

    // Switch to alumni
    act(() => {
      result.current.switchRole('alumni');
    });
    expect(result.current.role).toBe('alumni');
    expect(result.current.isAlum).toBe(true);
    expect(result.current.isStudent).toBe(false);
    expect(result.current.user.name).toBe(INITIAL_CURRENT_USER.name);
    expect(Repository.getCurrentUser().role).toBe('alumni');
  });

  it('toggles role back and forth with toggleRole()', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    
    // Initial role is alumni
    expect(result.current.role).toBe('alumni');

    act(() => {
      result.current.toggleRole();
    });
    expect(result.current.role).toBe('student');

    act(() => {
      result.current.toggleRole();
    });
    expect(result.current.role).toBe('alumni');
  });

  it('verifies student email using dynamic brand studentEmailDomain (@gatech.edu)', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    // Invalid non-gatech email
    act(() => {
      const response = result.current.verifyStudentEmail('george.burdell@gmail.com');
      expect(response.success).toBe(false);
      expect(response.error).toContain('@gatech.edu');
    });

    // Valid GT student email
    act(() => {
      const response = result.current.verifyStudentEmail('gburdell@gatech.edu');
      expect(response.success).toBe(true);
    });

    expect(result.current.user.email).toBe('gburdell@gatech.edu');
    expect(result.current.user.verified).toBe(true);
    expect(result.current.user.verificationMethod).toBe('gatech_sso');
    expect(result.current.user.role).toBe('student');
  });

  it('verifies alumni using alumni email domain (@alumni.gatech.edu)', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    act(() => {
      const fail = result.current.verifyAlumniEmail('random@yahoo.com');
      expect(fail.success).toBe(false);
      expect(fail.error).toContain('@alumni.gatech.edu');
    });

    act(() => {
      const ok = result.current.verifyAlumniEmail('buzz@alumni.gatech.edu');
      expect(ok.success).toBe(true);
    });

    expect(result.current.user.email).toBe('buzz@alumni.gatech.edu');
    expect(result.current.user.verified).toBe(true);
    expect(result.current.user.verificationMethod).toBe('domain');
    expect(result.current.user.role).toBe('alumni');
  });

  it('verifies alumni using LinkedIn profile URL', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    act(() => {
      const fail = result.current.verifyAlumniLinkedIn('not-a-valid-url');
      expect(fail.success).toBe(false);
      expect(fail.error).toContain('LinkedIn');
    });

    act(() => {
      const ok = result.current.verifyAlumniLinkedIn('https://www.linkedin.com/in/buzz-gatech-alumni');
      expect(ok.success).toBe(true);
    });

    expect(result.current.user.linkedinUrl).toBe('https://www.linkedin.com/in/buzz-gatech-alumni');
    expect(result.current.user.verified).toBe(true);
    expect(result.current.user.verificationMethod).toBe('linkedin');
    expect(result.current.user.role).toBe('alumni');
  });

  it('verifies alumni via 1-tap peer vouching', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    const initialVouches = result.current.user.vouchesCount || 0;

    act(() => {
      const ok = result.current.verifyAlumniPeerVouch('Georgia Tech Alumni Club');
      expect(ok.success).toBe(true);
    });

    expect(result.current.user.verified).toBe(true);
    expect(result.current.user.verificationMethod).toBe('peer_vouch');
    expect(result.current.user.role).toBe('alumni');
    expect(result.current.user.vouchesCount).toBe(initialVouches + 1);
    expect(result.current.user.vouchedBy).toContain('Georgia Tech Alumni Club');
  });

  it('enforces 3-5 hobbies constraint during onboarding completion', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    // Under 3 hobbies
    act(() => {
      const fail = result.current.completeOnboarding({
        major: 'Computer Science',
        gradYear: 2026,
        hobbies: ['bouldering', 'running'],
      });
      expect(fail.success).toBe(false);
      expect(fail.error).toContain('between 3 and 5 hobbies');
    });

    // Over 5 hobbies
    act(() => {
      const fail = result.current.completeOnboarding({
        major: 'Computer Science',
        gradYear: 2026,
        hobbies: ['1', '2', '3', '4', '5', '6'],
      });
      expect(fail.success).toBe(false);
      expect(fail.error).toContain('between 3 and 5 hobbies');
    });

    // Valid 3-5 hobbies
    act(() => {
      const ok = result.current.completeOnboarding({
        major: 'Computer Science',
        gradYear: 2026,
        hobbies: ['AI startups', 'bouldering', 'pour-over coffee', 'robotics'],
      });
      expect(ok.success).toBe(true);
    });

    expect(result.current.user.hobbies).toEqual([
      'AI startups',
      'bouldering',
      'pour-over coffee',
      'robotics',
    ]);
  });
});

describe('DemoRoleSwitcher Component', () => {
  beforeEach(() => {
    Repository.resetAllData();
  });

  it('renders student and alum preview buttons with verification badge', () => {
    render(
      React.createElement(
        BrandProvider,
        null,
        React.createElement(AuthProvider, null, React.createElement(DemoRoleSwitcher, { showDetails: true }))
      )
    );

    expect(screen.getByTestId('demo-role-switcher')).toBeInTheDocument();
    expect(screen.getByTestId('switch-student-btn')).toBeInTheDocument();
    expect(screen.getByTestId('switch-alum-btn')).toBeInTheDocument();
    expect(screen.getByTestId('open-onboarding-btn')).toBeInTheDocument();
  });

  it('switches role from Alumni to Student when clicking Preview as Student button', () => {
    render(
      React.createElement(
        BrandProvider,
        null,
        React.createElement(AuthProvider, null, React.createElement(DemoRoleSwitcher, null))
      )
    );

    const studentBtn = screen.getByTestId('switch-student-btn');
    fireEvent.click(studentBtn);

    expect(studentBtn).toHaveAttribute('aria-pressed', 'true');
    expect(Repository.getCurrentUser().role).toBe('student');
  });

  it('switches role back to Alum when clicking Preview as Alum button', () => {
    render(
      React.createElement(
        BrandProvider,
        null,
        React.createElement(AuthProvider, null, React.createElement(DemoRoleSwitcher, null))
      )
    );

    const studentBtn = screen.getByTestId('switch-student-btn');
    const alumBtn = screen.getByTestId('switch-alum-btn');

    fireEvent.click(studentBtn);
    expect(studentBtn).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(alumBtn);
    expect(alumBtn).toHaveAttribute('aria-pressed', 'true');
    expect(Repository.getCurrentUser().role).toBe('alumni');
  });
});

describe('OnboardingModal Component', () => {
  beforeEach(() => {
    Repository.resetAllData();
  });

  it('renders onboarding modal when isOpen is true', () => {
    render(
      React.createElement(
        BrandProvider,
        null,
        React.createElement(AuthProvider, null, React.createElement(OnboardingModal, { isOpen: true }))
      )
    );

    expect(screen.getByTestId('onboarding-modal')).toBeInTheDocument();
    expect(screen.getByTestId('role-student-btn')).toBeInTheDocument();
    expect(screen.getByTestId('role-alumni-btn')).toBeInTheDocument();
    expect(screen.getByTestId('hobbies-count')).toBeInTheDocument();
  });

  it('adds and toggles hobbies and prevents exceeding 5 hobbies', () => {
    render(
      React.createElement(
        BrandProvider,
        null,
        React.createElement(AuthProvider, null, React.createElement(OnboardingModal, { isOpen: true }))
      )
    );

    const customInput = screen.getByTestId('custom-hobby-input');
    const addBtn = screen.getByTestId('add-custom-hobby-btn');

    // Add a custom hobby
    fireEvent.change(customInput, { target: { value: 'pickleball league' } });
    fireEvent.click(addBtn);

    // Custom hobbies are capitalized like every other hobby
    expect(screen.getByText('Pickleball League')).toBeInTheDocument();
  });

  it('allows 1-tap peer vouch for alumni in the modal', () => {
    render(
      React.createElement(
        BrandProvider,
        null,
        React.createElement(AuthProvider, null, React.createElement(OnboardingModal, { isOpen: true }))
      )
    );

    // Click alumni role
    fireEvent.click(screen.getByTestId('role-alumni-btn'));

    // Switch to peer vouch tab
    fireEvent.click(screen.getByTestId('alum-tab-vouch'));

    // Tap peer vouch
    const vouchBtn = screen.getByTestId('peer-vouch-btn');
    fireEvent.click(vouchBtn);

    expect(screen.getByText(/1-Tap Peer Vouch registered/i)).toBeInTheDocument();
  });
});
