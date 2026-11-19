import { Button, Field, Input } from '@platlab/ui';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router';
import { Wordmark } from '../../app/brand';
import { env } from '../../app/env';
import { useSession } from '../../app/session';

const demoAccounts = [
  { email: 'admin@demo.platlab.test', role: 'Administradora en Química y en Física' },
  { email: 'operador@demo.platlab.test', role: 'Operador en Química, Administrador en Biología' },
  { email: 'propietaria@demo.platlab.test', role: 'Propietaria de Química: opera como Administradora' },
  { email: 'docente@demo.platlab.test', role: 'Docente en Química, sin acceso a Reactivos' },
  { email: 'estudiante@demo.platlab.test', role: 'Invitada a Química como Estudiante: se une con «Unirme»' },
  { email: 'visita@demo.platlab.test', role: 'Invitado a Química como Visita: se une con «Unirme»' },
];

/** La contraseña de una cuenta nueva: Auth exige un mínimo y aquí se pide uno algo mayor. */
const MIN_PASSWORD = 8;

export function LoginPage() {
  const { session, signIn, signUp } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Volver adonde se quería ir (p. ej., el frasco de una etiqueta QR), solo si es una ruta de la app.
  const from = (useLocation().state as { from?: unknown } | null)?.from;
  const target = typeof from === 'string' && (from.startsWith('/e/') || from.startsWith('/q/')) ? from : '/espacios';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // «Crear cuenta» (ADR 0027): para quien está en la lista blanca de un laboratorio y todavía no tiene cuenta.
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [notice, setNotice] = useState<string | null>(null);
  const expired = params.get('sesion') === 'expirada';
  const signingUp = mode === 'sign-up';

  if (session) return <Navigate to={target} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (signingUp && password.length < MIN_PASSWORD) {
      setError(`Usa al menos ${MIN_PASSWORD} caracteres.`);
      return;
    }
    setPending(true);
    if (signingUp) {
      const result = await signUp(email.trim(), password);
      setPending(false);
      if ('error' in result) setError(result.error);
      else if (result.confirm) setNotice('Te enviamos un correo para confirmar la cuenta. Ábrelo y después inicia sesión.');
      else navigate(target, { replace: true });
      return;
    }
    const failure = await signIn(email.trim(), password);
    setPending(false);
    if (failure) setError(failure);
    else navigate(target, { replace: true });
  }

  const switchMode = () => {
    setMode(signingUp ? 'sign-in' : 'sign-up');
    setError(null);
    setNotice(null);
  };

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-[420px] rounded-card bg-surface p-8 shadow-float">
        <Wordmark className="text-lg" />
        <h1 className="mt-8 text-display text-ink">{signingUp ? 'Crea tu cuenta' : 'Inicia sesión'}</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          {signingUp
            ? 'Usa el correo que tu laboratorio agregó a su lista. Al entrar verás su espacio para unirte.'
            : 'Usa la cuenta con la que te invitaron a tu laboratorio.'}
        </p>

        {expired ? (
          <p role="status" className="mt-6 rounded-control bg-warning-soft px-3 py-2.5 text-sm text-warning">
            Tu sesión terminó. Vuelve a iniciar sesión para continuar.
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="mt-6 rounded-control bg-action-soft px-3 py-2.5 text-sm text-action">
            {notice}
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
              autoComplete={signingUp ? 'new-password' : 'current-password'}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          <Button type="submit" variant="primary" loading={pending} className="mt-2 w-full">
            {signingUp ? 'Crear cuenta' : 'Entrar'}
          </Button>
        </form>
        {env.signupEnabled ? (
          <p className="mt-4 text-center text-sm text-ink-muted">
            {signingUp ? '¿Ya tienes cuenta?' : '¿Te invitaron y no tienes cuenta?'}{' '}
            <button type="button" onClick={switchMode} className="font-semibold text-action underline-offset-2 hover:underline">
              {signingUp ? 'Inicia sesión' : 'Crear cuenta'}
            </button>
          </p>
        ) : null}

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
