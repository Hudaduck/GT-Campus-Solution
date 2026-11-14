import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrandProvider } from '../../shared/config/brandConfig';
import { Repository, DEMO_STUDENT_USER } from '../../shared/data/repository';
import { AuthProvider, MyProfileDrawer } from './index';

function renderDrawer() {
  return render(
    React.createElement(
      BrandProvider,
      null,
      React.createElement(AuthProvider, null, React.createElement(MyProfileDrawer, { isOpen: true, onClose: () => {} }))
    )
  );
}

describe('My Profile drawer (career profile editing)', () => {
  beforeEach(() => {
    Repository.resetAllData();
    Repository.setCurrentUser(DEMO_STUDENT_USER);
  });

  it('renders as a bottom sheet with a drag handle', () => {
    renderDrawer();
    expect(screen.getByTestId('my-profile-drawer').className).toContain('tp-sheet-backdrop');
    expect(screen.getByTestId('sheet-drag-handle')).toBeDefined();
  });

  it('persists added work history, target companies, target roles and hobbies', () => {
    renderDrawer();

    fireEvent.change(screen.getByPlaceholderText('Company (e.g. NCR Voyix)'), { target: { value: 'Figma' } });
    fireEvent.change(screen.getByPlaceholderText('Role (e.g. SWE Intern)'), { target: { value: 'APM Intern' } });
    fireEvent.change(screen.getByPlaceholderText("Period (e.g. Summer '24)"), { target: { value: 'Summer 2026' } });
    fireEvent.click(screen.getByPlaceholderText("Period (e.g. Summer '24)").nextElementSibling as HTMLElement);

    const companyInput = screen.getByPlaceholderText(/Add target company/);
    fireEvent.change(companyInput, { target: { value: 'Delta Air Lines' } });
    fireEvent.keyDown(companyInput, { key: 'Enter' });

    const roleInput = screen.getByPlaceholderText(/Add target role/);
    fireEvent.change(roleInput, { target: { value: 'APM / Product Manager' } });
    fireEvent.keyDown(roleInput, { key: 'Enter' });

    fireEvent.click(screen.getByRole('button', { name: 'Hiking' }));
    fireEvent.click(screen.getByTestId('save-profile-button'));

    const saved = Repository.getCurrentUser();
    expect(saved.workHistory?.some((w) => w.company === 'Figma' && w.role === 'APM Intern' && w.period === 'Summer 2026')).toBe(true);
    expect(saved.targetCompanies).toContain('Delta Air Lines');
    expect(saved.targetRoles).toContain('APM / Product Manager');
    expect(saved.hobbies).toContain('Hiking');

    const inDirectory = Repository.getProfiles().find((p) => p.id === DEMO_STUDENT_USER.id);
    expect(inDirectory?.targetCompanies).toContain('Delta Air Lines');
  });
});
