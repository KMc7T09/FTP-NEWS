import { Trash2 } from 'lucide-react';

export default function ConfirmButton({ children = 'Delete', message = 'Are you sure?', onConfirm, className = '' }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 ${className}`}
      onClick={() => {
        if (window.confirm(message)) onConfirm?.();
      }}
    >
      <Trash2 size={16} />
      {children}
    </button>
  );
}
