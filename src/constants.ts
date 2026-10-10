import type { SectionDefinition, SectionKey } from './types';

export const SECTIONS: SectionDefinition[] = [
  { id: 'contents', label: 'Conteúdos', description: 'Gramática, estruturas e regras', kind: 'content', goal: 53, icon: 'book-open-check' },
  { id: 'verbs', label: 'Verbos', description: 'Ações e formas verbais', kind: 'vocabulary', goal: 200, icon: 'repeat-2' },
  { id: 'nouns', label: 'Substantivos', description: 'Pessoas, objetos e ideias', kind: 'vocabulary', goal: 300, icon: 'shapes' },
  { id: 'adjectives', label: 'Adjetivos', description: 'Características e qualidades', kind: 'vocabulary', goal: 200, icon: 'sparkles' },
  { id: 'adverbs', label: 'Advérbios', description: 'Tempo, frequência e intensidade', kind: 'vocabulary', goal: 100, icon: 'gauge' },
  { id: 'prepositions', label: 'Preposições', description: 'Tempo, lugar, direção e relações', kind: 'vocabulary', goal: 80, icon: 'map-pin' },
  { id: 'phrasal-verbs', label: 'Phrasal verbs', description: 'Verbos combinados com partículas', kind: 'vocabulary', goal: 150, icon: 'combine' },
  { id: 'expressions', label: 'Expressões', description: 'Frases e combinações frequentes', kind: 'vocabulary', goal: 150, icon: 'messages-square' },
];

export const SECTION_BY_KEY = Object.fromEntries(SECTIONS.map((s) => [s.id, s])) as Record<SectionKey, SectionDefinition>;

export const LEVELS = [
  { value: 0, label: 'Não estudado', shortLabel: 'Não estudado' },
  { value: 1, label: 'Baixo', shortLabel: 'Baixo' },
  { value: 2, label: 'Médio', shortLabel: 'Médio' },
  { value: 3, label: 'Alto', shortLabel: 'Alto' },
] as const;

export function levelLabel(level: number): string {
  return LEVELS.find((item) => item.value === level)?.label ?? 'Não estudado';
}

export function sectionGoalDefaults(): Record<SectionKey, number> {
  return Object.fromEntries(SECTIONS.map((section) => [section.id, section.goal])) as Record<SectionKey, number>;
}

export const DEFAULT_SETTINGS = {
  overall_word_goal: 1000,
  section_goals: sectionGoalDefaults(),
};
