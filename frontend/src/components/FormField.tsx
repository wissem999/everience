import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

interface FieldProps {
  label: string;
  children: ReactNode;
  error?: boolean;
  hint?: string;
}

function Field({ label, children, error, hint }: FieldProps) {
  return (
    <label className="block">
      <span className={`mb-1.5 block text-sm font-medium ${error ? 'text-red-600' : 'text-gray-700'}`}>
        {label}
      </span>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </label>
  );
}

const base =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400';
const normal = `${base} border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10`;
const errorCls = `${base} border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-4 focus:ring-red-500/10`;

export function TextInput({
  label,
  error,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: boolean; hint?: string }) {
  return (
    <Field label={label} error={error} hint={hint}>
      <input {...props} className={error ? errorCls : normal} />
    </Field>
  );
}

export function TextArea({
  label,
  error,
  hint,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: boolean; hint?: string }) {
  return (
    <Field label={label} error={error} hint={hint}>
      <textarea {...props} className={`${error ? errorCls : normal} resize-none`} />
    </Field>
  );
}

export function Select({
  label,
  error,
  hint,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: boolean; hint?: string }) {
  return (
    <Field label={label} error={error} hint={hint}>
      <select {...props} className={`${error ? errorCls : normal} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.293%207.293a1%201%200%20011.414%200L10%2010.586l3.293-3.293a1%201%200%20111.414%201.414l-4%204a1%201%200%2001-1.414%200l-4-4a1%201%200%20010-1.414z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_8px_center] bg-no-repeat pr-10`}>
        {children}
      </select>
    </Field>
  );
}
