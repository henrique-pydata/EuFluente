import { useState, type FormEvent } from 'react';
import { BookOpenCheck, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';

interface AuthPanelProps {
  client: SupabaseClient;
}

export default function AuthPanel({ client }: AuthPanelProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'login') {
        const { error: signInError } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await client.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setSuccess('Conta criada. Confira seu e-mail para confirmar o cadastro e depois entre no EuFluente.');
        } else {
          setSuccess('Conta criada. Abrindo seu espaço de estudos…');
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível concluir a operação.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="auth-brand-mark"><BookOpenCheck size={26} strokeWidth={2.1} /></div>
        <p className="eyebrow">SEU ESPAÇO DE APRENDIZADO</p>
        <h1>Eu<span>Fluente</span></h1>
        <p className="auth-intro">Organize seu inglês. Acompanhe o que já domina. Continue de onde parou.</p>

        <div className="auth-tabs" role="tablist" aria-label="Acesso">
          <button type="button" className={mode === 'login' ? 'selected' : ''} onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>Entrar</button>
          <button type="button" className={mode === 'signup' ? 'selected' : ''} onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}>Criar conta</button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="auth-email">E-mail</label>
          <div className="auth-input-wrap"><Mail size={17} /><input id="auth-email" autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" /></div>

          <label className="field-label" htmlFor="auth-password">Senha</label>
          <div className="auth-input-wrap"><LockKeyhole size={17} /><input id="auth-password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Pelo menos 6 caracteres" /></div>

          {error && <div className="message message-error" role="alert">{error}</div>}
          {success && <div className="message message-success" role="status">{success}</div>}

          <button type="submit" className="button button-primary auth-submit" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={17} /> : null}
            {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar no EuFluente' : 'Criar minha conta'}
          </button>
        </form>
        <p className="auth-footnote">Seus registros ficam associados à sua conta. Não compartilhe suas credenciais.</p>
      </section>
    </main>
  );
}
