import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import BudgetLinesEditor from '../components/BudgetLinesEditor';

afterEach(() => {
  cleanup();
});

/**
 * Locks fractional-quantity support in the budget shopping list:
 * adding a 0.5 kg item must emit quantity 0.5 (not truncate to 1) and a
 * correct line_total (0.5 x 4000 = 2000).
 */
function openAddModal() {
  const buttons = screen.getAllByRole('button', { name: /Add item/i });
  fireEvent.click(buttons[0]);
}

describe('BudgetLinesEditor fractional quantities', () => {
  it('emits a fractional quantity with the correct line total', () => {
    const onChange = vi.fn();
    render(<BudgetLinesEditor value={[]} onChange={onChange} />);

    openAddModal();

    const nameInput = screen.getByPlaceholderText(/e\.g\. Bread, Milk/i);
    const qtyInput = screen.getByPlaceholderText('1');
    const priceInput = screen.getByPlaceholderText('0.00');

    fireEvent.change(nameInput, { target: { value: 'Sugar' } });
    fireEvent.change(qtyInput, { target: { value: '0.5' } });
    fireEvent.change(priceInput, { target: { value: '4000' } });

    const saveButtons = screen.getAllByRole('button', { name: /Add item/i });
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0][0];
    expect(emitted).toHaveLength(1);
    expect(emitted[0].quantity).toBe(0.5);
    expect(emitted[0].line_total).toBe(2000);
  });

  it('keeps whole-number quantities unchanged', () => {
    const onChange = vi.fn();
    render(<BudgetLinesEditor value={[]} onChange={onChange} />);

    openAddModal();

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Bread, Milk/i), { target: { value: 'Milk' } });
    fireEvent.change(screen.getByPlaceholderText('1'), { target: { value: '2' } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '5000' } });

    const saveButtons = screen.getAllByRole('button', { name: /Add item/i });
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    const emitted = onChange.mock.calls[0][0];
    expect(emitted[0].quantity).toBe(2);
    expect(emitted[0].line_total).toBe(10000);
  });

  it('edits an existing line to a fractional quantity', () => {
    const onChange = vi.fn();
    render(<BudgetLinesEditor value={[{ id: 1, personal_budget_id: 1, item_name: 'Flour', quantity: 1, unit_price: 3000, line_total: 3000, purchased: false, expense_id: null }]} onChange={onChange} />);

    fireEvent.click(screen.getByTitle('Edit item'));

    fireEvent.change(screen.getByPlaceholderText('1'), { target: { value: '1.5' } });
    fireEvent.click(screen.getByRole('button', { name: /Save item/i }));

    const emitted = onChange.mock.calls[0][0];
    expect(emitted[0].quantity).toBe(1.5);
    expect(emitted[0].line_total).toBe(4500);
  });
});