import { useEffect, useId, useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { useSession } from '@/app/providers/SessionProvider';
import { useLogin } from '@/shared/api/auth';
import { SegmentedTabs } from '@/shared/ui';
import './login.css';

type Mode = 'pin' | 'password';

/** PROPUESTA: longitud del PIN de caja (los PIN de prueba de supervisor tienen 4 dígitos). */
const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

const PinPad = ({
  onDigit, onDelete, onSubmit, canSubmit, disabled,
}: { onDigit: (d: string) => void; onDelete: () => void; onSubmit: () => void; canSubmit: boolean; disabled: boolean }) => (
  <div className="app-pinpad" role="group" aria-label="Teclado numérico">
    {KEYS.map((key) => (
      <button key={key} type="button" className="app-pinpad__key" disabled={disabled} onClick={() => onDigit(key)}>{key}</button>
    ))}
    <button type="button" className="app-pinpad__key app-pinpad__key--ghost" disabled={disabled} onClick={onDelete} aria-label="Borrar último dígito">
      <i className="pi pi-delete-left" aria-hidden="true" />
    </button>
    <button type="button" className="app-pinpad__key" disabled={disabled} onClick={() => onDigit('0')}>0</button>
    <button
      type="button"
      className="app-pinpad__key app-pinpad__key--submit"
      disabled={disabled || !canSubmit}
      onClick={onSubmit}
      aria-label="Ingresar"
    >
      <i className="pi pi-arrow-right" aria-hidden="true" />
    </button>
  </div>
);

/** Acceso: PIN en teclado táctil (maqueta ref-1 · 02) o usuario y contraseña. Ambos usan `useLogin`. */
export const LoginPage = () => {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const login = useLogin();
  const [mode, setMode] = useState<Mode>('pin');
  const [username, setUsername] = useState('');
  const [secret, setSecret] = useState('');
  const userId = useId();
  const passId = useId();
  const busy = login.isPending;

  const submit = () => {
    if (busy || username.trim() === '' || secret === '') return;
    // El PIN/contraseña solo viaja en el cuerpo de la petición; no se registra ni se persiste.
    login.mutate(
      { username: username.trim(), password: secret },
      {
        onSuccess: (auth) => {
          setSecret('');
          signIn(auth);
          void navigate({ to: '/' });
        },
        onError: () => setSecret(''),
      },
    );
  };

  const onFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  // Teclado físico y lector: dígitos, Backspace y Enter funcionan aunque el foco esté en el teclado táctil.
  useEffect(() => {
    if (mode !== 'pin') return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select')) return;
      if (/^\d$/.test(event.key)) {
        setSecret((s) => (s.length < PIN_LENGTH ? s + event.key : s));
      } else if (event.key === 'Backspace') {
        setSecret((s) => s.slice(0, -1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  const changeMode = (next: Mode) => {
    setMode(next);
    setSecret('');
    login.reset();
  };

  return (
    <main className="app-login">
      <section className="app-login__card" aria-labelledby="login-title">
        <div className="app-login__brand">
          <i className="pi pi-shop" aria-hidden="true" />
          <span>Comercial Demo</span>
        </div>
        <h1 id="login-title" className="app-login__title">
          {mode === 'pin' ? 'Ingrese su PIN para continuar' : 'Inicie sesión para continuar'}
        </h1>

        <SegmentedTabs
          variant="tabs"
          ariaLabel="Método de acceso"
          value={mode}
          onChange={changeMode}
          options={[{ value: 'pin', label: 'PIN' }, { value: 'password', label: 'Usuario y contraseña' }]}
        />

        <form className="app-login__form" onSubmit={onFormSubmit} noValidate>
          <label htmlFor={userId} className="app-login__label">Usuario</label>
          <InputText
            id={userId}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoFocus
          />

          {mode === 'pin' ? (
            <>
              <div
                className="app-login__dots"
                role="img"
                aria-label={`PIN: ${secret.length} de ${PIN_LENGTH} dígitos`}
              >
                {Array.from({ length: PIN_LENGTH }, (_, i) => (
                  <span key={i} className={`app-login__dot${i < secret.length ? ' is-filled' : ''}`} aria-hidden="true" />
                ))}
              </div>
              <PinPad
                disabled={busy}
                canSubmit={secret.length === PIN_LENGTH && username.trim() !== ''}
                onDigit={(d) => setSecret((s) => (s.length < PIN_LENGTH ? s + d : s))}
                onDelete={() => setSecret((s) => s.slice(0, -1))}
                onSubmit={submit}
              />
              <p className="app-login__hint">
                PROPUESTA: el PIN se envía hoy como contraseña a <code>/auth/login</code>; falta un contrato de acceso por PIN.
              </p>
            </>
          ) : (
            <>
              <label htmlFor={passId} className="app-login__label">Contraseña</label>
              <Password
                inputId={passId}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                feedback={false}
                toggleMask
                autoComplete="current-password"
                inputStyle={{ width: '100%' }}
                style={{ width: '100%' }}
              />
              <Button type="submit" label="Ingresar" icon="pi pi-sign-in" loading={busy} className="w-full mt-3" />
            </>
          )}
        </form>

        <div aria-live="assertive">
          {login.isError ? (
            <p className="app-login__error" role="alert" data-testid="login-error">
              {login.error.message || 'No se pudo iniciar sesión.'}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
};
