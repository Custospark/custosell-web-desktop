import { describe, expect, it, vi, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PipelineNumberInput } from '../ui/PipelineNumberInput';

afterEach(() => {
  cleanup();
});

function Stateful({ initial = 0, min, max }: { initial?: number; min?: number; max?: number }) {
  const [value, setValue] = useState(initial);
  return <PipelineNumberInput value={value} onChange={setValue} min={min} max={max} />;
}

/**
 * Locks the clear-on-focus contract: a default "0" must clear when the user
 * focuses the field so they can type their own value without fighting a zero.
 */
describe('PipelineNumberInput', () => {
  it('renders 0 as an empty draft (not a literal zero)', () => {
    render(<PipelineNumberInput value={0} onChange={() => {}} />);
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('');
  });

  it('clears the draft on focus when the value is 0', () => {
    render(<PipelineNumberInput value={0} onChange={() => {}} />);
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    fireEvent.focus(input);
    expect(input.value).toBe('');
  });

  it('types a custom value and commits it on blur', () => {
    const onChange = vi.fn();
    render(<PipelineNumberInput value={0} onChange={onChange} />);
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '14' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(14);
  });

  it('shows the committed value after the parent re-renders', () => {
    render(<Stateful />);
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '14' } });
    fireEvent.blur(input);
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('14');
  });

  it('commits 0 when cleared (user removes the value)', () => {
    const onChange = vi.fn();
    render(<PipelineNumberInput value={5} onChange={onChange} />);
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('respects min when committing', () => {
    const onChange = vi.fn();
    render(<PipelineNumberInput value={0} onChange={onChange} min={1} />);
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '-3' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('shows an existing nonzero value', () => {
    render(<PipelineNumberInput value={7} onChange={() => {}} />);
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('7');
  });
});