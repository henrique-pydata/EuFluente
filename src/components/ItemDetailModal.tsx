import { BookOpen, CalendarDays, Pencil, Trash2, X } from 'lucide-react';
import type { LearningContent, SectionKey, VocabularyItem } from '../types';
import { SECTION_BY_KEY } from '../constants';

interface ItemDetailModalProps {
  item: VocabularyItem | LearningContent;
  sectionKey: SectionKey;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function isContent(item: VocabularyItem | LearningContent): item is LearningContent {
  return 'title' in item;
}

export default function ItemDetailModal({ item, sectionKey, onClose, onEdit, onDelete }: ItemDetailModalProps) {
  const content = isContent(item);
  const title = content ? item.title : item.word;
  const section = SECTION_BY_KEY[sectionKey];
  const level = content ? item.mastery_level : sectionKey === 'verbs' ? Math.min(item.mastery_level, item.past_mastery_level) : item.mastery_level;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <header className="modal-header">
          <div>
            <p className="eyebrow">{section.label.toLocaleUpperCase('pt-BR')}</p>
            <h2 id="detail-title" className="detail-modal-title">{title}</h2>
            {!content && <p className="detail-translation">{item.translation}</p>}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar"><X size={19} /></button>
        </header>

        {!content && sectionKey === 'verbs' && (
          <div className="verb-forms-grid">
            <div><span>Forma base / presente</span><strong>{item.base_form || item.word}</strong></div>
            <div><span>Passado simples</span><strong>{item.past_simple || 'Não informado'}</strong></div>
            <div><span>Particípio passado</span><strong>{item.past_participle || 'Não informado'}</strong></div>
          </div>
        )}

        {content && (
          <div className="detail-property"><span>Área</span><strong>{item.content_area || 'Geral'}</strong></div>
        )}
        <div className="detail-property"><span>Nível de domínio</span><strong className={`detail-level-text level-name level-${level}`}>{['Não estudado', 'Baixo', 'Médio', 'Alto'][level] ?? 'Não estudado'}</strong></div>
        <div className="detail-property"><span><BookOpen size={14} /> Anotações</span><p className="detail-notes">{item.notes?.trim() || 'Nenhuma anotação adicionada.'}</p></div>
        {item.created_at && <div className="detail-date"><CalendarDays size={14} /> Adicionado em {new Date(item.created_at).toLocaleDateString('pt-BR')}</div>}
        <footer className="modal-actions modal-actions-spread">
          <button type="button" className="button button-danger-quiet" onClick={onDelete}><Trash2 size={16} /> Excluir</button>
          <div className="inline-actions"><button type="button" className="button button-secondary" onClick={onClose}>Fechar</button><button type="button" className="button button-primary" onClick={onEdit}><Pencil size={15} /> Editar</button></div>
        </footer>
      </section>
    </div>
  );
}
