import { Monitor, Moon, Sun } from 'lucide-react';

const modes = [
  { value: 'auto', label: 'системная', icon: Monitor },
  { value: 'dark', label: 'тёмная', icon: Moon },
  { value: 'light', label: 'светлая', icon: Sun },
];

export function ThemeToggle({ mode, onChange }) {
  const index = modes.findIndex((item) => item.value === mode);
  const current = modes[index];
  const next = modes[(index + 1) % modes.length];
  const Icon = current.icon;
  const label = `Тема: ${current.label}. Следующая: ${next.label}`;

  return (
    <button className="btn btn-outline-secondary theme-toggle d-inline-flex align-items-center justify-content-center flex-shrink-0" type="button" onClick={() => onChange(next.value)} aria-label={label} title={label}>
      <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
