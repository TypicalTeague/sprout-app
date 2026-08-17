// Shared lightweight in-UI delete confirm — click once to arm, click again
// to confirm. No window.confirm() (constitution.md / spec.md stories 7, 8).

import { useEffect, useRef, useState } from 'react';

interface ConfirmButtonProps {
  onConfirm: () => void;
  label: string;
  confirmLabel?: string;
  className?: string;
  armedMs?: number;
}

export function ConfirmButton({
  onConfirm,
  label,
  confirmLabel = 'Confirm?',
  className = '',
  armedMs = 4000,
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleClick = () => {
    if (!armed) {
      setArmed(true);
      timeoutRef.current = setTimeout(() => setArmed(false), armedMs);
      return;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setArmed(false);
    onConfirm();
  };

  return (
    <button
      type="button"
      className={`${className} ${armed ? 'confirm-armed' : ''}`}
      onClick={handleClick}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
