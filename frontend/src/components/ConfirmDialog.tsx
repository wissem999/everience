import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  danger?: boolean;
}

export function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirmer',
  danger = false,
}: ConfirmDialogProps) {
  const root = document.getElementById('modal-root');
  if (!root) return null;

  const modal = (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        className="animate-scale-in"
        style={{ width: '100%', maxWidth: '24rem', borderRadius: '1rem', backgroundColor: '#fff', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
      >
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '3rem', height: '3rem', borderRadius: '9999px', backgroundColor: danger ? '#fef2f2' : '#eff6ff' }}>
          {danger ? (
            <svg style={{ width: '1.5rem', height: '1.5rem', color: '#dc2626' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          ) : (
            <svg style={{ width: '1.5rem', height: '1.5rem', color: '#2563eb' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          )}
        </div>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>{title}</h2>
        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.625 }}>{message}</p>
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ borderRadius: '0.75rem', border: '1px solid #e5e7eb', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151', background: '#fff', cursor: 'pointer' }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{ borderRadius: '0.75rem', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#fff', backgroundColor: danger ? '#dc2626' : '#2563eb', border: 'none', cursor: 'pointer' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, root);
}
