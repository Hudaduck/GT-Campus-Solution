import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { HobbyCombobox } from './HobbyCombobox';

const SUGGESTIONS = ['Hiking', 'Hackathons', 'Basketball', 'Baking', 'Board Games', 'Running', 'Chess'];

function Harness({ initial = [] as string[], onValue }: { initial?: string[]; onValue?: (v: string[]) => void }) {
  const [value, setValue] = useState<string[]>(initial);
  return React.createElement(HobbyCombobox, {
    value,
    suggestions: SUGGESTIONS,
    max: 5,
    onChange: (v) => {
      setValue(v);
      onValue?.(v);
    },
  });
}

const input = () => screen.getByRole('combobox', { name: 'Add a hobby' }) as HTMLInputElement;
const optionNames = () => screen.queryAllByRole('option').map((o) => o.textContent);

describe('HobbyCombobox', () => {
  it('filters suggestions as you type, prefix matches first', () => {
    render(React.createElement(Harness));
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: 'ba' } });
    // "Basketball" and "Baking" start with "ba"; "Board Games"... doesn't contain "ba"
    expect(optionNames().slice(0, 2).sort()).toEqual(['Baking', 'Basketball']);
    expect(optionNames()).not.toContain('Hiking');
  });

  it('adds a suggestion by click and hides it from further suggestions', () => {
    let latest: string[] = [];
    render(React.createElement(Harness, { onValue: (v) => (latest = v) }));
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: 'hik' } });
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Hiking' }));

    expect(latest).toEqual(['Hiking']);
    expect(input().value).toBe('');
    expect(screen.getByRole('button', { name: 'Remove Hiking' })).toBeDefined();
    fireEvent.change(input(), { target: { value: 'hik' } });
    expect(optionNames()).not.toContain('Hiking');
  });

  it('supports keyboard: arrows to move, Enter to pick', () => {
    let latest: string[] = [];
    render(React.createElement(Harness, { onValue: (v) => (latest = v) }));
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: 'h' } }); // Hiking, Hackathons, ... (prefix first)
    const second = optionNames()[1]!;
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[1].getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(latest).toEqual([second]);
  });

  it('lets you add your own hobby when it is not in the list (formatted)', () => {
    let latest: string[] = [];
    render(React.createElement(Harness, { onValue: (v) => (latest = v) }));
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: 'competitive  sailing' } });
    const addOption = screen.getAllByRole('option').find((o) => o.textContent === 'Add "Competitive Sailing"')!;
    expect(addOption).toBeDefined();
    fireEvent.mouseDown(addOption);
    expect(latest).toEqual(['Competitive Sailing']);
  });

  it('does not offer "Add" for an exact existing match, and ignores duplicates', () => {
    let latest: string[] = ['Chess'];
    render(React.createElement(Harness, { initial: ['Chess'], onValue: (v) => (latest = v) }));
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: 'running' } });
    expect(optionNames()).toEqual(['Running']);
    fireEvent.change(input(), { target: { value: 'chess' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(latest).toEqual(['Chess']);
  });

  it('removes chips with the X button or Backspace in an empty box', () => {
    let latest: string[] = [];
    render(React.createElement(Harness, { initial: ['Chess', 'Running'], onValue: (v) => (latest = v) }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Chess' }));
    expect(latest).toEqual(['Running']);
    fireEvent.keyDown(input(), { key: 'Backspace' });
    expect(latest).toEqual([]);
  });

  it('caps at the max and says how to make room', () => {
    render(React.createElement(Harness, { initial: ['Chess', 'Running', 'Hiking', 'Baking', 'Hackathons'] }));
    expect(input().disabled).toBe(true);
    expect(input().placeholder).toMatch(/5 of 5 added/);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Chess' }));
    expect(input().disabled).toBe(false);
  });
});
