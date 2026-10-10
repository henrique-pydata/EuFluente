import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { LEVELS, SECTION_BY_KEY } from '../constants';
import type { ContentDraft, LearningContent, MasteryLevel, SectionKey, VocabularyDraft, VocabularyItem } from '../types';

interface ItemFormModalProps {
  sectionKey: SectionKey;
  item?: VocabularyItem | LearningContent | null;
  onClose: () => void;
  onSave: (draft: VocabularyDraft | ContentDraft, item?: VocabularyItem | LearningContent) => Promise<void>;
}

function isContentItem(item: VocabularyItem | LearningContent | null | undefined): item is LearningContent {
  return Boolean(item && 'title' in item);
}

export default function ItemFormModal({ sectionKey, item, onClose, onSave }: ItemFormModalProps) {
  const section = SECTION_BY_KEY[sectionKey];
  const isContent = sectionKey === 'contents';
  const editing = Boolean(item);
  const addTitle = sectionKey === 'contents' ? 'Adicionar conteúdo' : sectionKey === 'verbs' ? 'Adicionar verbo' : sectionKey === 'nouns' ? 'Adicionar substantivo' : sectionKey === 'adjectives' ? 'Adicionar adjetivo' : sectionKey === 'adverbs' ? 'Adicionar advérbio' : sectionKey === 'prepositions' ? 'Adicionar preposição' : sectionKey === 'phrasal-verbs' ? 'Adicionar phrasal verb' : 'Adicionar expressão';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [pastSimple, setPastSimple] = useState('');
  const [pastParticiple, setPastParticiple] = useState('');
  const [title, setTitle] = useState('');
  const [area, setArea] = useState('Gramática');
  const [notes, setNotes] = useState('');
  const [level, setLevel] = useState<MasteryLevel>(0);

  useEffect(() => {
    if (!item) return;
    if (isContentItem(item)) {
      setTitle(item.title);
      setArea(item.content_area || 'Gramática');
      setNotes(item.notes || '');
      setLevel(item.mastery_level as MasteryLevel);
    } else {
      setWord(item.word);
      setTranslation(item.translation);
      setPastSimple(item.past_simple || '');
      setPastParticiple(item.past_participle || '');
      setNotes(item.notes || '');
      setLevel(Math.min(item.mastery_level, item.past_mastery_level) as MasteryLevel);
    }
  }, [item]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (isContent) {
        if (!title.trim()) throw new Error('Informe o título do conteúdo.');
        await onSave({ title: title.trim(), content_area: area.trim() || 'Geral', notes, mastery_level: level }, item ?? undefined);
      } else {
        if (!word.trim()) throw new Error('Informe a palavra em inglês.');
        if (!translation.trim()) throw new Error('Informe a tradução que você quer estudar.');
        if (sectionKey === 'verbs' && !pastSimple.trim()) throw new Error('Informe o passado simples do verbo.');
        if (sectionKey === 'verbs' && !pastParticiple.trim()) throw new Error('Informe o particípio do verbo.');
        await onSave({
          word: word.trim(),
          translation: translation.trim(),
          past_simple: pastSimple.trim(),
          past_participle: pastParticiple.trim(),
          mastery_level: level,
          notes,
        }, item ?? undefined);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar este registro.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="item-modal-title">
        <header className="modal-header">
          <div>
            <p className="eyebrow">{section.label.toLocaleUpperCase('pt-BR')}</p>
            <h2 id="item-modal-title">{editing ? 'Editar registro' : addTitle}</h2>
            <p>{isContent ? 'Registre o tema que você quer estudar e acompanhe seu domínio.' : 'A tradução fica sob seu critério. Os dados serão salvos no seu vocabulário.'}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar"><X size={19} /></button>
        </header>

        <form onSubmit={handleSubmit}>
          {isContent ? (
            <>
              <div className="form-field"><label htmlFor="content-title">Título do conteúdo *</label><input id="content-title" required autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Present Perfect" /></div>
              <div className="form-field"><label htmlFor="content-area">Área</label><input id="content-area" value={area} onChange={(event) => setArea(event.target.value)} placeholder="Ex.: Gramática, tempos verbais…" /></div>
              <div className="form-field"><label htmlFor="content-notes">Anotações</label><textarea id="content-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Regras, exemplos e pontos que você quer revisar…" rows={4} /></div>
            </>
          ) : (
            <>
              <div className="form-field"><label htmlFor="vocab-word">{sectionKey === 'expressions' ? 'Expressão em inglês' : sectionKey === 'phrasal-verbs' ? 'Phrasal verb' : 'Palavra em inglês'} *</label><input id="vocab-word" autoFocus required value={word} onChange={(event) => setWord(event.target.value)} placeholder={sectionKey === 'verbs' ? 'Ex.: know' : sectionKey === 'phrasal-verbs' ? 'Ex.: give up' : 'Ex.: thoughtful'} /></div>
              <div className="form-field"><label htmlFor="vocab-translation">Tradução escolhida por você *</label><input id="vocab-translation" required value={translation} onChange={(event) => setTranslation(event.target.value)} placeholder="Ex.: saber" /></div>
              {sectionKey === 'verbs' && (
                <div className="form-grid">
                  <div className="form-field"><label htmlFor="verb-past">Passado simples *</label><input id="verb-past" required value={pastSimple} onChange={(event) => setPastSimple(event.target.value)} placeholder="Ex.: knew" /></div>
                  <div className="form-field"><label htmlFor="verb-participle">Particípio passado *</label><input id="verb-participle" required value={pastParticiple} onChange={(event) => setPastParticiple(event.target.value)} placeholder="Ex.: known" /></div>
                </div>
              )}
              <div className="form-field"><label htmlFor="vocab-notes">Anotações (opcional)</label><textarea id="vocab-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="Contexto, exemplo ou observação pessoal…" /></div>
            </>
          )}

          <div className="form-field"><label htmlFor="item-level">Nível de domínio</label><select id="item-level" value={level} onChange={(event) => setLevel(Number(event.target.value) as MasteryLevel)}>{LEVELS.map((itemLevel) => <option key={itemLevel.value} value={itemLevel.value}>{itemLevel.label}</option>)}</select></div>
          <p className="form-hint">{isContent ? 'O progresso de Conteúdos é calculado pelos tópicos marcados como Alto.' : sectionKey === 'verbs' ? 'Para verbos, o nível alto só conta como dominado quando o verbo e o passado estiverem no nível Alto.' : 'O nível Alto conta para a meta geral de palavras dominadas.'}</p>
          {error && <div className="message message-error" role="alert">{error}</div>}
          <footer className="modal-actions">
            <button type="button" className="button button-secondary" onClick={onClose} disabled={busy}>Cancelar</button>
            <button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Salvando…' : editing ? 'Salvar alterações' : 'Adicionar'}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}
