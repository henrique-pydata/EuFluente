import { useEffect, useState, type FormEvent } from 'react';
import { Target, X } from 'lucide-react';
import type { SectionKey } from '../types';
import { SECTION_BY_KEY } from '../constants';

interface GoalModalProps {
  sectionKey?: SectionKey;
  currentGoal: number;
  onClose: () => void;
  onSave: (value: number) => Promise<void>;
}

export default function GoalModal({ sectionKey, currentGoal, onClose, onSave }: GoalModalProps) {
  const [value, setValue] = useState(String(currentGoal));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isOverall = !sectionKey;
  const title = isOverall ? 'Meta geral de palavras' : `Meta de ${SECTION_BY_KEY[sectionKey].label.toLocaleLowerCase('pt-BR')}`;

  useEffect(() => setValue(String(currentGoal)), [currentGoal]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const number = Number(value);
    if (!Number.isFinite(number) || number < 1) {
      setError('Informe uma meta maior que zero.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSave(Math.round(number));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar a meta.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal-card modal-card-small" role="dialog" aria-modal="true" aria-labelledby="goal-modal-title">
        <header className="modal-header">
          <div className="modal-title-with-icon"><span className="modal-icon"><Target size={20} /></span><div><p className="eyebrow">OBJETIVO</p><h2 id="goal-modal-title">{title}</h2></div></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar"><X size={19} /></button>
        </header>
        <form onSubmit={submit}>
          <div className="form-field"><label htmlFor="goal-number">Quantidade que você quer dominar</label><input id="goal-number" type="number" min="1" step="1" autoFocus value={value} onChange={(event) => setValue(event.target.value)} required /></div>
          <p className="form-hint">A barra é calculada com base nos registros classificados como Alto, não apenas nos itens cadastrados.</p>
          {error && <div className="message message-error" role="alert">{error}</div>}
          <footer className="modal-actions"><button className="button button-secondary" type="button" onClick={onClose} disabled={busy}>Cancelar</button><button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar meta'}</button></footer>
        </form>
      </section>
    </div>
  );
}
