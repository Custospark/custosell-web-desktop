import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StoreModuleGrid } from '../../components/layout/ModuleLauncherTiles';
import { MODULE_LAUNCHER_CATALOG } from '../../components/layout/moduleLauncherCatalog';

const items = MODULE_LAUNCHER_CATALOG.filter((item) =>
  ['dashboard', 'sales', 'discover'].includes(item.slug),
);

function tile(label: string): HTMLButtonElement {
  return screen.getByRole('button', { name: new RegExp(label, 'i') }) as HTMLButtonElement;
}

describe('StoreModuleGrid - circular check toggles', () => {
  afterEach(() => {
    cleanup();
  });

  it('marks checked apps and calls onToggle with the slug when clicked', () => {
    const onToggle = vi.fn();
    render(
      <StoreModuleGrid
        items={items}
        checkedSlugs={new Set(['dashboard'])}
        saving={false}
        changedSlugs={new Set(['sales'])}
        onToggle={onToggle}
      />,
    );

    expect(tile('dashboard').getAttribute('aria-pressed')).toBe('true');
    expect(tile('sales').getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(tile('sales'));
    expect(onToggle).toHaveBeenCalledWith('sales');
  });

  it('locks the settings tile and disables every tile while saving', () => {
    const onToggle = vi.fn();
    const settings = MODULE_LAUNCHER_CATALOG.filter((item) => item.slug === 'settings');
    const { rerender } = render(
      <StoreModuleGrid items={settings} checkedSlugs={new Set()} saving={false} onToggle={onToggle} />,
    );
    expect(tile('settings').disabled).toBe(true);

    rerender(
      <StoreModuleGrid items={items} checkedSlugs={new Set()} saving onToggle={onToggle} />,
    );
    for (const item of items) {
      expect(tile(item.label).disabled).toBe(true);
    }
    fireEvent.click(tile('dashboard'));
    expect(onToggle).not.toHaveBeenCalled();
  });
});
