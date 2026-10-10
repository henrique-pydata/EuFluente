export type SectionKind = 'vocabulary' | 'content';

export type SectionKey =
  | 'contents'
  | 'verbs'
  | 'nouns'
  | 'adjectives'
  | 'adverbs'
  | 'prepositions'
  | 'phrasal-verbs'
  | 'expressions';

export interface SectionDefinition {
  id: SectionKey;
  label: string;
  description: string;
  kind: SectionKind;
  goal: number;
  icon: string;
}

export interface VocabularyItem {
  id: string;
  user_id?: string;
  section_key: SectionKey;
  word: string;
  translation: string;
  base_form: string | null;
  past_simple: string | null;
  past_participle: string | null;
  mastery_level: number;
  past_mastery_level: number;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LearningContent {
  id: string;
  user_id?: string;
  section_key: 'contents';
  title: string;
  content_area: string;
  notes: string | null;
  mastery_level: number;
  created_at?: string;
  updated_at?: string;
}

export interface UserSettings {
  user_id?: string;
  overall_word_goal: number;
  section_goals: Partial<Record<SectionKey, number>>;
  updated_at?: string;
}

export interface AppData {
  vocabulary: VocabularyItem[];
  contents: LearningContent[];
  settings: UserSettings;
}

export type MasteryLevel = 0 | 1 | 2 | 3;

export interface VocabularyDraft {
  word: string;
  translation: string;
  past_simple: string;
  past_participle: string;
  mastery_level: MasteryLevel;
  notes: string;
}

export interface ContentDraft {
  title: string;
  content_area: string;
  notes: string;
  mastery_level: MasteryLevel;
}
