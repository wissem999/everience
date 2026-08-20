import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
  isOpen?: boolean;
}

export function Modal({ title, onClose, children, maxWidth = 'max-w-lg', isOpen = true }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose, isOpen]);

  if (!isOpen) return null;

  const root = document.getElementById('modal-root');
  if (!root) return null;

  const maxW = maxWidth === 'max-w-xl' ? '36rem' : maxWidth === 'max-w-md' ? '28rem' : '32rem';

  const modal = (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div
        className="animate-scale-in w-full max-h-[90dvh] overflow-y-auto sm:max-h-[85vh]"
        style={{ maxWidth: maxW, borderRadius: '1rem', backgroundColor: '#fff', padding: 'clamp(1rem, 3vw, 1.5rem)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827' }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2rem', height: '2rem', borderRadius: '0.5rem', color: '#9ca3af', border: 'none', background: 'none', cursor: 'pointer' }}
          >
            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );

  return createPortal(modal, root);
}
