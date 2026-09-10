import { useEffect } from 'react';

export function useModalEscape(isOpen, onClose, popoverStates = []) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        for (const [isOpen, setIsOpen] of popoverStates) {
          if (isOpen) { setIsOpen(false); return; }
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, ...popoverStates.map(([s]) => s)]);
}
