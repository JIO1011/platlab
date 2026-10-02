import { Button, Field, Input } from '@platlab/ui';
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { Wordmark } from '../../app/brand';
import { useSession } from '../../app/session';

const demoAccounts = [
  { email: 'admin@demo.platlab.test', role: 'Administradora en Química y en Física' },
  { email: 'operador@demo.platlab.test', role: 'Operador en Química, Administrador en Biología' },
  { email: 'propietaria@demo.platlab.test', role: 'Propietaria de Química, sin rol operativo' },
];

export function LoginPage() {
  const { session, signIn } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const expired = params.get('sesion') === 'expirada';

  if (session) return <Navigate to="/espacios" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const failure = await signIn(email.trim(), password);
    setPending(false);
    if (failure) setError(failure);
    else navigate('/espacios', { replace: true });
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-[420px] rounded-card bg-surface p-8 shadow-float">
        <Wordmark className="text-lg" />
        <h1 className="mt-8 text-display text-ink">Inicia sesión</h1>
        <p className="mt-1.5 text-sm text-ink-muted">Usa la cuenta con la que te invitaron a tu laboratorio.</p>

        {expired ? (
          <p role="status" className="mt-6 rounded-control bg-warning-soft px-3 py-2.5 text-sm text-warning">
            Tu sesión terminó. Vuelve a iniciar sesión para continuar.
          </p>
        ) : null}

        <form onSubmit={(event) => void submit(event)} className="mt-6 grid gap-4" noValidate>
          <Field label="Correo">
            <Input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label="Contraseña" error={error ?? undefined}>
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          <Button type="submit" variant="primary" loading={pending} className="mt-2 w-full">
            Entrar
          </Button>
        </form>

        {import.meta.env.DEV ? (
          <section className="mt-8 rounded-panel bg-canvas p-4" aria-label="Cuentas de demo">
            <h2 className="text-[13px] font-semibold text-ink">Cuentas de demo (solo local)</h2>
            <p className="mt-1 text-[13px] text-ink-muted">Contraseña: platlab-demo</p>
            <ul className="mt-3 grid gap-2">
              {demoAccounts.map((account) => (
                <li key={account.email}>
                  <button
                    type="button"
                    className="w-full rounded-control px-2 py-1.5 text-left transition-colors hover:bg-surface-sunken"
                    onClick={() => {
                      setEmail(account.email);
                      setPassword('platlab-demo');
                    }}
                  >
                    <span className="block text-[13px] font-medium text-ink">{account.email}</span>
                    <span className="block text-[12px] text-ink-muted">{account.role}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
