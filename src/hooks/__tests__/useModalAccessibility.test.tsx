// @vitest-environment jsdom
import { useRef, useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useModalAccessibility } from '../useModalAccessibility';

afterEach(() => {
  cleanup();
});

function TestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useModalAccessibility(open, ref, onClose);

  if (!open) return null;
  return (
    <div ref={ref} role="dialog" aria-modal="true" tabIndex={-1}>
      <button type="button">Primeiro</button>
      <button type="button">Ultimo</button>
    </div>
  );
}

function ModalHarness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir
      </button>
      <TestModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

describe('useModalAccessibility', () => {
  it('closes on Escape and locks/restores body scroll', () => {
    const onClose = vi.fn();
    const { rerender } = render(<TestModal open={true} onClose={onClose} />);

    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(<TestModal open={false} onClose={onClose} />);
    expect(document.body.style.overflow).toBe('');
  });

  it('restores focus to the triggering element after closing', () => {
    render(<ModalHarness />);
    const openBtn = screen.getByRole('button', { name: 'Abrir' });
    openBtn.focus();
    fireEvent.click(openBtn);

    expect(screen.getByRole('dialog')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(openBtn);
  });
});
