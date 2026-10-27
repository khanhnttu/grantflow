/**
 * RoleSwitcher — top-bar role picker: Hacker / Organizer / Judge.
 * Persisted to localStorage. Exported as a component and a hook.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { Code2, Building2, Scale } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Role = 'hacker' | 'organizer' | 'judge';

export interface RoleCtx {
  role: Role;
  setRole: (r: Role) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const Ctx = createContext<RoleCtx>({ role: 'hacker', setRole: () => {} });

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => {
    const stored = localStorage.getItem('gf_role');
    return (stored as Role | null) ?? 'hacker';
  });

  const setRole = useCallback((r: Role) => {
    localStorage.setItem('gf_role', r);
    setRoleState(r);
  }, []);

  return <Ctx.Provider value={{ role, setRole }}>{children}</Ctx.Provider>;
}

export function useRole() { return useContext(Ctx); }

// ── UI ────────────────────────────────────────────────────────────────────────

const ROLES: { id: Role; label: string; Icon: typeof Code2 }[] = [
  { id: 'hacker',    label: 'Hacker',    Icon: Code2     },
  { id: 'organizer', label: 'Organizer', Icon: Building2 },
  { id: 'judge',     label: 'Judge',     Icon: Scale     },
];

export function RoleSwitcher({ onSwitch }: { onSwitch?: (r: Role) => void } = {}) {
  const { role, setRole } = useRole();

  const handleClick = (id: Role) => {
    setRole(id);
    onSwitch?.(id);
  };

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg px-1 py-1"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {ROLES.map(({ id, label, Icon }) => {
        const active = role === id;
        return (
          <button
            key={id}
            onClick={() => handleClick(id)}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            style={active
              ? { background: 'var(--accent)', color: '#fff' }
              : { color: 'var(--text-muted)' }
            }
          >
            <Icon size={12} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
