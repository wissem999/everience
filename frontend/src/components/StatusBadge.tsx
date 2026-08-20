const STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  Actif: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Besoin Actif': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
};

export function StatusBadge({ status }: { status?: string }) {
  const s = STYLES[status ?? ''] ?? { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}
