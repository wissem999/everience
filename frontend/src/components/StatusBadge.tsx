export function StatusBadge({ status }: { status?: string }) {
  const active = status === 'Actif';
  return (
    <span
      className={
        active
          ? 'inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700'
          : 'inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700'
      }
    >
      {status}
    </span>
  );
}
