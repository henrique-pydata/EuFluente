import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  ArrowLeft, BookOpen, BookOpenCheck, Check, ChevronRight, CircleHelp,
  Combine, Gauge, Goal, Layers3, LogOut, MapPin, MessagesSquare, Plus, Repeat2,
  Search, Shapes, Sparkles, Target, X, SlidersHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import AuthPanel from './components/AuthPanel';
import GoalModal from './components/GoalModal';
import ItemDetailModal from './components/ItemDetailModal';
import ItemFormModal from './components/ItemFormModal';
import LevelProgress from './components/LevelProgress';
import Toast from './components/Toast';
import { DEFAULT_SETTINGS, LEVELS, SECTIONS, SECTION_BY_KEY } from './constants';
import {
  deleteLearningContent, deleteVocabularyItem, getRepositoryMode, loadAppData,
  saveLearningContent, saveUserSettings, saveVocabularyItem,
} from './lib/repository';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import type {
  AppData, ContentDraft, LearningContent, MasteryLevel, SectionKey, UserSettings,
  VocabularyDraft, VocabularyItem,
} from './types';

const sectionIcons: Record<string, LucideIcon> = {
  'book-open-check': BookOpenCheck,
  'repeat-2': Repeat2,
  shapes: Shapes,
  sparkles: Sparkles,
  gauge: Gauge,
  'map-pin': MapPin,
  combine: Combine,
  'messages-square': MessagesSquare,
};

type ItemRecord = VocabularyItem | LearningContent;
type DetailTarget = { sectionKey: SectionKey; item: ItemRecord };
type FormTarget = { sectionKey: SectionKey; item?: ItemRecord };

function itemIsContent(item: ItemRecord): item is LearningContent {
  return 'title' in item;
}

function itemLevel(item: ItemRecord, sectionKey: SectionKey): number {
  if (itemIsContent(item)) return item.mastery_level;
  if (sectionKey === 'verbs') return Math.min(item.mastery_level, item.past_mastery_level);
  return item.mastery_level;
}

function isMastered(item: ItemRecord, sectionKey: SectionKey): boolean {
  return itemLevel(item, sectionKey) === 3;
}

function percent(value: number, goal: number): number {
  return goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('en-US');
}

function addLabel(sectionKey: SectionKey): string {
  const labels: Record<SectionKey, string> = {
    contents: 'Adicionar conteúdo',
    verbs: 'Adicionar verbo',
    nouns: 'Adicionar substantivo',
    adjectives: 'Adicionar adjetivo',
    adverbs: 'Adicionar advérbio',
    prepositions: 'Adicionar preposição',
    'phrasal-verbs': 'Adicionar phrasal verb',
    expressions: 'Adicionar expressão',
  };
  return labels[sectionKey];
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [appData, setAppData] = useState<AppData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | 'all'>('all');
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);
  const [goalTarget, setGoalTarget] = useState<{ sectionKey?: SectionKey } | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) console.error('Erro ao recuperar sessão:', error);
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });
    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    window.setTimeout(() => setToastMessage((current) => current === message ? '' : current), 3100);
  }, []);

  const refreshData = useCallback(async () => {
    setDataLoading(true);
    setDataError('');
    try {
      const nextData = await loadAppData();
      setAppData(nextData);
    } catch (error) {
      console.error('Erro ao carregar EuFluente:', error);
      setDataError(error instanceof Error ? error.message : 'Não foi possível carregar os dados.');
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      void refreshData();
      return;
    }
    if (!authReady) return;
    if (!session) {
      setAppData(null);
      setDataLoading(false);
      return;
    }
    void refreshData();
  }, [session, authReady, refreshData]);

  const settings = appData?.settings ?? {
    ...DEFAULT_SETTINGS,
    section_goals: { ...DEFAULT_SETTINGS.section_goals },
  } as UserSettings;
  const vocabulary = appData?.vocabulary ?? [];
  const contents = appData?.contents ?? [];
  const masteredVocabulary = vocabulary.filter((item) => isMastered(item, item.section_key)).length;
  const overallGoal = settings.overall_word_goal || 1000;
  const overallPercent = percent(masteredVocabulary, overallGoal);

  const sectionStats = useMemo(() => Object.fromEntries(SECTIONS.map((section) => {
    const items: ItemRecord[] = section.id === 'contents'
      ? contents
      : vocabulary.filter((item) => item.section_key === section.id);
    const mastered = items.filter((item) => isMastered(item, section.id)).length;
    const goal = settings.section_goals?.[section.id] ?? section.goal;
    return [section.id, { items, total: items.length, mastered, goal, percent: percent(mastered, goal) }];
  })), [contents, vocabulary, settings.section_goals]) as Record<SectionKey, { items: ItemRecord[]; total: number; mastered: number; goal: number; percent: number }>;

  const activeDefinition = activeSection ? SECTION_BY_KEY[activeSection] : null;
  const activeItems = useMemo(() => {
    if (!activeSection) return [] as ItemRecord[];
    const base: ItemRecord[] = activeSection === 'contents'
      ? contents
      : vocabulary.filter((item) => item.section_key === activeSection);
    const normalizedSearch = normalize(search);
    return base.filter((item) => {
      const label = itemIsContent(item) ? item.title : item.word;
      const translation = itemIsContent(item) ? item.content_area : item.translation;
      const matchesSearch = !normalizedSearch || normalize(label).includes(normalizedSearch) || normalize(translation).includes(normalizedSearch) || normalize(item.notes || '').includes(normalizedSearch);
      const matchesLevel = levelFilter === 'all' || itemLevel(item, activeSection) === levelFilter;
      return matchesSearch && matchesLevel;
    }).sort((a, b) => {
      const left = itemIsContent(a) ? a.title : a.word;
      const right = itemIsContent(b) ? b.title : b.word;
      return left.localeCompare(right, 'en', { sensitivity: 'base' });
    });
  }, [activeSection, contents, levelFilter, search, vocabulary]);

  async function handleSignOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) showToast(error.message, 'error');
    else {
      setActiveSection(null);
      showToast('Você saiu da sua conta.', 'info');
    }
  }

  async function handleSaveItem(draft: VocabularyDraft | ContentDraft, existing?: ItemRecord) {
    if (!activeSection && !formTarget) return;
    const sectionKey = formTarget?.sectionKey ?? activeSection;
    if (!sectionKey) return;

    if (sectionKey === 'contents') {
      const contentDraft = draft as ContentDraft;
      const existingContent = existing && itemIsContent(existing) ? existing : undefined;
      const saved = await saveLearningContent({
        ...existingContent,
        ...(existingContent?.id ? { id: existingContent.id } : {}),
        section_key: 'contents',
        title: contentDraft.title,
        content_area: contentDraft.content_area,
        notes: contentDraft.notes,
        mastery_level: contentDraft.mastery_level,
      });
      setAppData((current) => current ? {
        ...current,
        contents: upsertLocal(current.contents, saved, (entry) => normalize(entry.title) === normalize(saved.title)),
      } : current);
    } else {
      const vocabularyDraft = draft as VocabularyDraft;
      const existingVocabulary = existing && !itemIsContent(existing) ? existing : undefined;
      const existingVisibleLevel = existingVocabulary && sectionKey === 'verbs'
        ? Math.min(existingVocabulary.mastery_level, existingVocabulary.past_mastery_level)
        : existingVocabulary?.mastery_level;
      const preserveExistingVerbLevels = sectionKey === 'verbs' && existingVocabulary && existingVisibleLevel === vocabularyDraft.mastery_level;
      const saved = await saveVocabularyItem({
        ...existingVocabulary,
        ...(existingVocabulary?.id ? { id: existingVocabulary.id } : {}),
        section_key: sectionKey,
        word: vocabularyDraft.word,
        translation: vocabularyDraft.translation,
        base_form: sectionKey === 'verbs' ? vocabularyDraft.word : null,
        past_simple: sectionKey === 'verbs' ? vocabularyDraft.past_simple : null,
        past_participle: sectionKey === 'verbs' ? vocabularyDraft.past_participle : null,
        mastery_level: preserveExistingVerbLevels ? existingVocabulary.mastery_level : vocabularyDraft.mastery_level,
        past_mastery_level: preserveExistingVerbLevels ? existingVocabulary.past_mastery_level : vocabularyDraft.mastery_level,
        notes: vocabularyDraft.notes,
      });
      setAppData((current) => current ? {
        ...current,
        vocabulary: upsertLocal(current.vocabulary, saved, (entry) => entry.section_key === saved.section_key && normalize(entry.word) === normalize(saved.word)),
      } : current);
    }

    setFormTarget(null);
    setDetailTarget(null);
    showToast(existing ? 'Alterações salvas.' : 'Item adicionado ao seu material.');
  }

  async function handleDeleteItem(item: ItemRecord, sectionKey: SectionKey) {
    const label = itemIsContent(item) ? item.title : item.word;
    const confirmed = window.confirm(`Excluir “${label}” do seu material? Essa ação não pode ser desfeita.`);
    if (!confirmed) return;
    try {
      if (itemIsContent(item)) {
        await deleteLearningContent(item.id);
        setAppData((current) => current ? { ...current, contents: current.contents.filter((entry) => entry.id !== item.id) } : current);
      } else {
        await deleteVocabularyItem(item.id);
        setAppData((current) => current ? { ...current, vocabulary: current.vocabulary.filter((entry) => entry.id !== item.id) } : current);
      }
      setDetailTarget(null);
      setFormTarget(null);
      showToast('Registro excluído.', 'info');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível excluir este registro.', 'error');
    }
    void sectionKey;
  }

  async function handleLevelChange(item: ItemRecord, sectionKey: SectionKey, nextLevel: number) {
    try {
      if (itemIsContent(item)) {
        const saved = await saveLearningContent({ ...item, mastery_level: nextLevel as MasteryLevel });
        setAppData((current) => current ? { ...current, contents: current.contents.map((entry) => entry.id === saved.id ? saved : entry) } : current);
      } else {
        const saved = await saveVocabularyItem({
          ...item,
          section_key: sectionKey,
          mastery_level: nextLevel as MasteryLevel,
          past_mastery_level: nextLevel as MasteryLevel,
        });
        setAppData((current) => current ? { ...current, vocabulary: current.vocabulary.map((entry) => entry.id === saved.id ? saved : entry) } : current);
      }
      showToast('Nível atualizado.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível atualizar o nível.', 'error');
    }
  }

  async function handleSaveGoal(value: number) {
    const next: UserSettings = goalTarget?.sectionKey
      ? { ...settings, section_goals: { ...settings.section_goals, [goalTarget.sectionKey]: value } }
      : { ...settings, overall_word_goal: value };
    const saved = await saveUserSettings(next);
    setAppData((current) => current ? { ...current, settings: saved } : current);
    setGoalTarget(null);
    showToast('Meta atualizada.');
  }

  function openSection(sectionKey: SectionKey) {
    setActiveSection(sectionKey);
    setSearch('');
    setLevelFilter('all');
  }

  if (isSupabaseConfigured && !authReady) {
    return <main className="loading-screen"><div className="loading-mark"><BookOpenCheck size={25} /></div><div className="loading-spinner" /><p>Preparando seu espaço…</p></main>;
  }

  if (isSupabaseConfigured && !session && supabase) {
    return <AuthPanel client={supabase} />;
  }

  if (dataLoading || !appData) {
    return <main className="loading-screen"><div className="loading-mark"><BookOpenCheck size={25} /></div>{dataError ? <><p>Não foi possível carregar seus dados.</p><p className="error-detail">{dataError}</p><button className="button button-primary" onClick={() => void refreshData()}>Tentar novamente</button></> : <><div className="loading-spinner" /><p>Carregando seu material…</p></>}</main>;
  }

  const currentSectionStats = activeSection ? sectionStats[activeSection] : null;
  const activeIsContent = activeSection === 'contents';
  const currentGoal = activeSection ? settings.section_goals?.[activeSection] ?? SECTION_BY_KEY[activeSection].goal : overallGoal;

  return (
    <div className="app-shell">
      <header className="topbar">
        <button type="button" className="brand-button" onClick={() => { setActiveSection(null); setSearch(''); setLevelFilter('all'); }} aria-label="Voltar ao painel inicial">
          <span className="brand-mark"><BookOpenCheck size={21} strokeWidth={2.2} /></span>
          <span className="brand-name">Eu<span>Fluente</span></span>
        </button>
        <div className="topbar-right">
          {getRepositoryMode() === 'demo' ? <span className="mode-pill"><span /> Demonstração local</span> : <span className="signed-in-label">{session?.user.email}</span>}
          {isSupabaseConfigured && session && <button type="button" className="icon-button topbar-logout" onClick={() => void handleSignOut()} aria-label="Sair da conta" title="Sair"><LogOut size={17} /></button>}
        </div>
      </header>

      {!activeSection ? (
        <main className="page-content">
          <section className="overview-card">
            <div className="overview-heading">
              <div>
                <div className="overview-title-row"><Target size={17} /><h1>Meta geral</h1></div>
                <p className="overview-subtitle">Palavras dominadas em todas as seções</p>
              </div>
              <button type="button" className="icon-button goal-edit-button" aria-label="Editar meta geral" title="Editar meta" onClick={() => setGoalTarget({})}><Goal size={18} /></button>
            </div>
            <div className="overview-count-row">
              <div className="overview-count"><strong>{masteredVocabulary.toLocaleString('pt-BR')}</strong><span>de {overallGoal.toLocaleString('pt-BR')} palavras</span></div>
              <strong className="overview-percent">{overallPercent}%</strong>
            </div>
            <div className="overall-track" role="progressbar" aria-valuemin={0} aria-valuemax={overallGoal} aria-valuenow={masteredVocabulary} aria-label="Progresso da meta geral"><div className="overall-fill" style={{ width: `${overallPercent}%` }} /></div>
            <div className="overview-foot"><span>{Math.max(0, overallGoal - masteredVocabulary).toLocaleString('pt-BR')} para atingir a meta</span><span>{vocabulary.length.toLocaleString('pt-BR')} cadastradas</span></div>
          </section>

          <div className="section-list-heading"><div><p className="eyebrow">SEU MATERIAL</p><h2>Seções de estudo</h2></div><span className="section-count-label">{SECTIONS.length} seções</span></div>
          <section className="section-grid" aria-label="Seções de estudo">
            {SECTIONS.map((section) => {
              const stats = sectionStats[section.id];
              const Icon = sectionIcons[section.icon] ?? BookOpen;
              return (
                <button key={section.id} type="button" className="section-card" onClick={() => openSection(section.id)}>
                  <div className="section-card-top"><span className="section-icon"><Icon size={22} strokeWidth={1.9} /></span><ChevronRight size={19} className="card-chevron" /></div>
                  <div className="section-card-title-row"><h3>{section.label}</h3><span className="section-progress-percent">{stats.percent}%</span></div>
                  <p className="section-card-description">{section.description}</p>
                  <div className="section-goal-line"><span>Progresso da meta</span><span>{stats.mastered} / {stats.goal}</span></div>
                  <div className="section-track" role="progressbar" aria-valuemin={0} aria-valuemax={stats.goal} aria-valuenow={stats.mastered} aria-label={`Meta de ${section.label}`}><div className="section-fill" style={{ width: `${stats.percent}%` }} /></div>
                  <div className="section-card-stats"><div><strong>{stats.total.toLocaleString('pt-BR')}</strong><span>{section.kind === 'content' ? 'conteúdos cadastrados' : 'palavras cadastradas'}</span></div><div><strong className="mastered-stat"><span className="status-dot" />{stats.mastered.toLocaleString('pt-BR')}</strong><span>{section.kind === 'content' ? 'conteúdos dominados' : 'palavras dominadas'}</span></div></div>
                </button>
              );
            })}
          </section>
          {getRepositoryMode() === 'demo' && <p className="demo-footnote"><CircleHelp size={13} /> Você está no modo de demonstração. As alterações ficam salvas neste navegador até configurar o Supabase.</p>}
        </main>
      ) : (
        <main className="page-content detail-page">
          <button type="button" className="back-link" onClick={() => { setActiveSection(null); setSearch(''); setLevelFilter('all'); }}><ArrowLeft size={16} /> Todas as seções</button>
          <div className="section-detail-header">
            <div className="section-detail-title">
              <span className="section-icon section-icon-large">{(() => { const Icon = sectionIcons[activeDefinition!.icon] ?? BookOpen; return <Icon size={25} />; })()}</span>
              <div><p className="eyebrow">SEÇÃO DE ESTUDO</p><h1>{activeDefinition?.label}</h1><p>{activeDefinition?.description}</p></div>
            </div>
            <div className="detail-header-actions">
              <button type="button" className="button button-secondary goal-section-button" onClick={() => setGoalTarget({ sectionKey: activeSection })}><Target size={16} /> Meta: {currentGoal}</button>
              <button type="button" className="button button-primary add-button" onClick={() => setFormTarget({ sectionKey: activeSection })}><Plus size={18} /> {addLabel(activeSection)}</button>
            </div>
          </div>

          <section className="section-metrics">
            <MetricCard label={activeIsContent ? 'Conteúdos cadastrados' : 'Palavras cadastradas'} value={currentSectionStats?.total ?? 0} icon={<Layers3 size={17} />} />
            <MetricCard label={activeIsContent ? 'Conteúdos dominados' : 'Palavras dominadas'} value={currentSectionStats?.mastered ?? 0} icon={<Check size={17} />} variant="green" />
            <MetricCard label="Meta da seção" value={`${currentSectionStats?.percent ?? 0}%`} icon={<Target size={17} />} note={`${currentSectionStats?.mastered ?? 0} de ${currentGoal}`} />
          </section>

          <section className="records-panel">
            <div className="records-toolbar">
              <div className="search-box">
                <Search size={17} />
                <input aria-label="Pesquisar" placeholder={activeIsContent ? 'Pesquisar conteúdo…' : 'Pesquisar palavra ou tradução…'} value={search} onChange={(event) => setSearch(event.target.value)} />
                {search && <button type="button" className="clear-search" onClick={() => setSearch('')} aria-label="Limpar pesquisa"><X size={14} /></button>}
              </div>
              <div className="level-filters" aria-label="Filtrar por nível">
                <SlidersHorizontal size={15} className="filter-icon" />
                <button type="button" className={levelFilter === 'all' ? 'filter-chip active' : 'filter-chip'} onClick={() => setLevelFilter('all')}>Todos</button>
                {LEVELS.map((level) => <button key={level.value} type="button" className={`filter-chip ${levelFilter === level.value ? 'active' : ''} ${level.value === 1 ? 'filter-low' : level.value === 2 ? 'filter-medium' : level.value === 3 ? 'filter-high' : ''}`} onClick={() => setLevelFilter(level.value)}>{level.label}</button>)}
              </div>
            </div>

            <div className="records-table">
              <div className="records-table-head"><span>{activeIsContent ? 'Conteúdo' : activeSection === 'verbs' ? 'Verbo / formas' : activeSection === 'expressions' ? 'Expressão' : activeSection === 'phrasal-verbs' ? 'Phrasal verb' : 'Palavra em inglês'}</span><span>{activeIsContent ? 'Área' : 'Tradução'}</span><span>Nível de domínio</span><span /></div>
              {activeItems.length === 0 ? (
                <div className="empty-state"><span className="empty-icon"><Search size={22} /></span><strong>{search || levelFilter !== 'all' ? 'Nenhum resultado encontrado' : activeIsContent ? 'Nenhum conteúdo cadastrado' : 'Nenhum item cadastrado'}</strong><p>{search || levelFilter !== 'all' ? 'Tente mudar a busca ou o filtro de nível.' : activeIsContent ? 'Adicione seu primeiro tópico para começar a acompanhar o progresso.' : 'Adicione sua primeira palavra para começar a montar esta seção.'}</p>{!search && levelFilter === 'all' && <button type="button" className="button button-primary" onClick={() => setFormTarget({ sectionKey: activeSection })}><Plus size={16} /> {addLabel(activeSection)}</button>}</div>
              ) : activeItems.map((item) => {
                const content = itemIsContent(item);
                const label = content ? item.title : item.word;
                const secondary = content ? item.content_area : activeSection === 'verbs' ? `Passado: ${item.past_simple || '—'}  ·  Particípio: ${item.past_participle || '—'}` : '';
                return (
                  <div className="records-row" key={`${activeSection}-${item.id}`}>
                    <div className="record-main">
                      <span className="record-letter">{label.trim().charAt(0).toLocaleUpperCase('en-US') || '•'}</span>
                      <div className="record-text"><button type="button" className="record-word" onClick={() => setDetailTarget({ sectionKey: activeSection, item })}>{label}</button>{secondary && <span className="record-secondary">{secondary}</span>}</div>
                    </div>
                    <div className="record-translation" data-label={activeIsContent ? 'Área' : 'Tradução'}>{content ? item.content_area || 'Geral' : item.translation}</div>
                    <div className="record-level"><LevelProgress level={itemLevel(item, activeSection)} compact onChange={(nextLevel) => void handleLevelChange(item, activeSection, nextLevel)} /></div>
                    <button type="button" className="record-more" onClick={() => setDetailTarget({ sectionKey: activeSection, item })} aria-label={`Detalhes de ${label}`} title="Ver detalhes"><ChevronRight size={18} /></button>
                  </div>
                );
              })}
            </div>
            <footer className="records-footer"><span>Exibindo {activeItems.length} de {currentSectionStats?.total ?? 0} registros</span><span>As alterações são salvas automaticamente</span></footer>
          </section>
          {activeSection === 'verbs' && <p className="section-tip"><CircleHelp size={14} /> O nível de um verbo considera a forma base e o passado simples. Ao ajustar o nível aqui, as duas formas ficam sincronizadas.</p>}
        </main>
      )}

      <footer className="app-footer"><span>EuFluente</span><span>Seu progresso, no seu ritmo.</span></footer>

      {formTarget && <ItemFormModal sectionKey={formTarget.sectionKey} item={formTarget.item ?? null} onClose={() => setFormTarget(null)} onSave={handleSaveItem} />}
      {detailTarget && <ItemDetailModal item={detailTarget.item} sectionKey={detailTarget.sectionKey} onClose={() => setDetailTarget(null)} onEdit={() => { setFormTarget({ sectionKey: detailTarget.sectionKey, item: detailTarget.item }); setDetailTarget(null); }} onDelete={() => void handleDeleteItem(detailTarget.item, detailTarget.sectionKey)} />}
      {goalTarget && <GoalModal sectionKey={goalTarget.sectionKey} currentGoal={goalTarget.sectionKey ? (settings.section_goals?.[goalTarget.sectionKey] ?? SECTION_BY_KEY[goalTarget.sectionKey].goal) : overallGoal} onClose={() => setGoalTarget(null)} onSave={handleSaveGoal} />}
      <Toast message={toastMessage} type={toastType} />
    </div>
  );
}

function upsertLocal<T extends { id: string }>(items: T[], incoming: T, sameItem?: (item: T) => boolean): T[] {
  const index = items.findIndex((item) => item.id === incoming.id || sameItem?.(item));
  if (index === -1) return [incoming, ...items];
  const copy = [...items];
  copy[index] = incoming;
  return copy;
}

function MetricCard({ label, value, icon, variant, note }: { label: string; value: string | number; icon: ReactNode; variant?: 'green'; note?: string }) {
  return (
    <div className={`metric-card ${variant === 'green' ? 'metric-card-green' : ''}`}>
      <span className="metric-icon">{icon}</span>
      <div className="metric-copy"><span>{label}</span><strong>{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</strong>{note && <small>{note}</small>}</div>
    </div>
  );
}
