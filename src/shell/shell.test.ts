import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrandProvider } from '../shared/config/brandConfig';
import { Repository } from '../shared/data/repository';
import App from '../App';

const renderApp = () => render(React.createElement(BrandProvider, null, React.createElement(App)));

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
}

describe('Responsive shells & live demo view switcher', () => {
  const originalWidth = window.innerWidth;

  beforeEach(() => {
    Repository.resetAllData();
    localStorage.removeItem('thirdplace_presenter_view');
  });

  afterEach(() => setViewportWidth(originalWidth));

  it('renders the native phone shell (56px header + bottom tab bar) below 768px', () => {
    setViewportWidth(390);
    renderApp();
    expect(screen.getByTestId('phone-shell')).toBeDefined();
    expect(screen.getByTestId('bottom-nav-dock').textContent).toMatch(/Map.*Connect 1-on-1.*Plans/);
    expect(screen.queryByTestId('view-mode-toggle')).toBeNull(); // presenters only switch on desktop
  });

  it('renders the desktop web app with a navigation rail at 768px and above', () => {
    setViewportWidth(1440);
    renderApp();
    expect(screen.getByTestId('web-shell')).toBeDefined();
    expect(screen.getByTestId('nav-tab-swipe').textContent).toContain('Connect 1-on-1');
    expect(screen.getByTestId('view-mode-web').getAttribute('aria-checked')).toBe('true');
  });

  it('switches live between Web App and the Phone App device frame', () => {
    setViewportWidth(1440);
    renderApp();

    fireEvent.click(screen.getByTestId('view-mode-phone'));
    const iframe = screen.getByTestId('phone-frame-iframe') as HTMLIFrameElement;
    expect(iframe.getAttribute('width')).toBe('412');
    expect(iframe.getAttribute('height')).toBe('860');
    expect(iframe.getAttribute('src')).toContain('frame=phone');
    expect(localStorage.getItem('thirdplace_presenter_view')).toBe('phone');

    fireEvent.click(screen.getByTestId('view-mode-web'));
    expect(screen.getByTestId('web-shell')).toBeDefined();
  });

  it('opens the My Profile sheet from the header avatar', () => {
    setViewportWidth(390);
    renderApp();
    fireEvent.click(screen.getByTestId('header-my-profile-button'));
    expect(screen.getByTestId('my-profile-drawer')).toBeDefined();
  });
});
