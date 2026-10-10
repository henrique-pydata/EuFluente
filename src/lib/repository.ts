import seedData from '../../data/initialSeed.json';
import { DEFAULT_SETTINGS } from '../constants';
import { isSupabaseConfigured, supabase } from './supabase';
import type { AppData, LearningContent, SectionKey, UserSettings, VocabularyItem } from '../types';

const DEMO_STORAGE_KEY = 'eu-fluente-demo-data-v1';
const FULL_SEED_MIGRATION_KEY = 'eu-fluente-full-seed-migrated-v1';

type SeedData = {
  vocabulary: Omit<VocabularyItem, 'id'>[];
  contents: Omit<LearningContent, 'id'>[];
  settings: UserSettings;
};

const initialSeed = seedData as SeedData;

function makeId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function vocabularyKey(item: Pick<VocabularyItem, 'section_key' | 'word'>): string {
  return `${item.section_key}::${item.word.trim().toLocaleLowerCase('en-US')}`;
}

function contentKey(item: Pick<LearningContent, 'title'>): string {
  return item.title.trim().toLocaleLowerCase('en-US');
}

function initialDemoData(): AppData {
  return {
    vocabulary: initialSeed.vocabulary.map((item) => ({
      ...item,
      id: `base-word-${item.section_key}-${slugify(item.word)}`,
    })) as VocabularyItem[],
    contents: initialSeed.contents.map((item) => ({
      ...item,
      id: `base-content-${slugify(item.title)}`,
    })) as LearningContent[],
    settings: {
      overall_word_goal: initialSeed.settings.overall_word_goal ?? DEFAULT_SETTINGS.overall_word_goal,
      section_goals: { ...DEFAULT_SETTINGS.section_goals, ...initialSeed.settings.section_goals },
    },
  };
}

/**
 * Load the full spreadsheet seed in local/demo mode. A one-time migration merges
 * the full base into any previously saved small demo dataset. The migration flag
 * prevents deleted words from reappearing on later reloads.
 */
function getDemoData(): AppData {
  const base = initialDemoData();
  try {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AppData;
      const storedVocabulary = Array.isArray(parsed.vocabulary) ? parsed.vocabulary : [];
      const storedContents = Array.isArray(parsed.contents) ? parsed.contents : [];
      const settings: UserSettings = {
        ...base.settings,
        ...(parsed.settings ?? {}),
        section_goals: {
          ...DEFAULT_SETTINGS.section_goals,
          ...base.settings.section_goals,
          ...(parsed.settings?.section_goals ?? {}),
        },
      };

      // Already migrated: do not resurrect items the user removed later.
      if (localStorage.getItem(FULL_SEED_MIGRATION_KEY) === '1') {
        return { vocabulary: storedVocabulary, contents: storedContents, settings };
      }

      const vocabularyByKey = new Map<string, VocabularyItem>(
        base.vocabulary.map((item) => [vocabularyKey(item), item] as const),
      );
      for (const savedItem of storedVocabulary) {
        const key = vocabularyKey(savedItem);
        const baseItem = vocabularyByKey.get(key);
        // Preserve the user's current values and ID if this word already existed.
        vocabularyByKey.set(key, baseItem ? { ...baseItem, ...savedItem, id: savedItem.id } : savedItem);
      }

      const contentsByKey = new Map<string, LearningContent>(
        base.contents.map((item) => [contentKey(item), item] as const),
      );
      for (const savedItem of storedContents) {
        const key = contentKey(savedItem);
        const baseItem = contentsByKey.get(key);
        contentsByKey.set(key, baseItem ? { ...baseItem, ...savedItem, id: savedItem.id } : savedItem);
      }

      const migrated: AppData = {
        vocabulary: [...vocabularyByKey.values()],
        contents: [...contentsByKey.values()],
        settings,
      };
      saveDemoData(migrated);
      localStorage.setItem(FULL_SEED_MIGRATION_KEY, '1');
      return migrated;
    }
  } catch (error) {
    console.warn('Não foi possível ler os dados locais; usando a base inicial.', error);
  }

  saveDemoData(base);
  localStorage.setItem(FULL_SEED_MIGRATION_KEY, '1');
  return base;
}

function saveDemoData(data: AppData): void {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
}

export async function loadAppData(): Promise<AppData> {
  if (!isSupabaseConfigured || !supabase) return getDemoData();

  const [vocabularyResult, contentResult, settingsResult] = await Promise.all([
    supabase.from('vocabulary_items').select('*').order('word', { ascending: true }),
    supabase.from('learning_contents').select('*').order('title', { ascending: true }),
    supabase.from('user_settings').select('*').maybeSingle(),
  ]);

  if (vocabularyResult.error) throw vocabularyResult.error;
  if (contentResult.error) throw contentResult.error;
  if (settingsResult.error) throw settingsResult.error;

  const rawSettings = settingsResult.data as UserSettings | null;
  const settings: UserSettings = rawSettings
    ? {
        ...rawSettings,
        section_goals: { ...DEFAULT_SETTINGS.section_goals, ...(rawSettings.section_goals ?? {}) },
      }
    : { ...DEFAULT_SETTINGS, section_goals: { ...DEFAULT_SETTINGS.section_goals } };

  return {
    vocabulary: (vocabularyResult.data ?? []) as VocabularyItem[],
    contents: (contentResult.data ?? []) as LearningContent[],
    settings,
  };
}

export async function saveVocabularyItem(item: Partial<VocabularyItem> & Pick<VocabularyItem, 'section_key' | 'word' | 'translation' | 'mastery_level'>): Promise<VocabularyItem> {
  const payload = {
    ...item,
    base_form: item.section_key === 'verbs' ? item.word.trim() : null,
    past_simple: item.section_key === 'verbs' ? (item.past_simple?.trim() || null) : null,
    past_participle: item.section_key === 'verbs' ? (item.past_participle?.trim() || null) : null,
    past_mastery_level: item.section_key === 'verbs' ? (item.past_mastery_level ?? item.mastery_level) : item.mastery_level,
    notes: item.notes?.trim() || null,
  };

  if (!isSupabaseConfigured || !supabase) {
    const data = getDemoData();
    const current = item.id ? data.vocabulary.find((entry) => entry.id === item.id) : undefined;
    const saved: VocabularyItem = {
      ...payload,
      id: current?.id ?? item.id ?? makeId(),
      created_at: current?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as VocabularyItem;
    const existingIndex = data.vocabulary.findIndex((entry) => entry.id === saved.id || (
      entry.section_key === saved.section_key && entry.word.trim().toLowerCase() === saved.word.trim().toLowerCase()
    ));
    if (existingIndex >= 0) data.vocabulary[existingIndex] = saved;
    else data.vocabulary.push(saved);
    saveDemoData(data);
    return saved;
  }

  const { data, error } = await supabase.from('vocabulary_items').upsert(payload).select('*').single();
  if (error) throw error;
  return data as VocabularyItem;
}

export async function deleteVocabularyItem(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const data = getDemoData();
    data.vocabulary = data.vocabulary.filter((entry) => entry.id !== id);
    saveDemoData(data);
    return;
  }
  const { error } = await supabase.from('vocabulary_items').delete().eq('id', id);
  if (error) throw error;
}

export async function saveLearningContent(item: Partial<LearningContent> & Pick<LearningContent, 'title' | 'content_area' | 'mastery_level'>): Promise<LearningContent> {
  const payload = {
    ...item,
    section_key: 'contents' as const,
    title: item.title.trim(),
    content_area: item.content_area.trim() || 'Geral',
    notes: item.notes?.trim() || null,
  };

  if (!isSupabaseConfigured || !supabase) {
    const data = getDemoData();
    const current = item.id ? data.contents.find((entry) => entry.id === item.id) : undefined;
    const saved: LearningContent = {
      ...payload,
      id: current?.id ?? item.id ?? makeId(),
      created_at: current?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as LearningContent;
    const existingIndex = data.contents.findIndex((entry) => entry.id === saved.id || entry.title.trim().toLowerCase() === saved.title.trim().toLowerCase());
    if (existingIndex >= 0) data.contents[existingIndex] = saved;
    else data.contents.push(saved);
    saveDemoData(data);
    return saved;
  }

  const { data, error } = await supabase.from('learning_contents').upsert(payload).select('*').single();
  if (error) throw error;
  return data as LearningContent;
}

export async function deleteLearningContent(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const data = getDemoData();
    data.contents = data.contents.filter((entry) => entry.id !== id);
    saveDemoData(data);
    return;
  }
  const { error } = await supabase.from('learning_contents').delete().eq('id', id);
  if (error) throw error;
}

export async function saveUserSettings(settings: UserSettings): Promise<UserSettings> {
  const normalized: UserSettings = {
    ...settings,
    overall_word_goal: Math.max(1, Math.round(Number(settings.overall_word_goal) || 1)),
    section_goals: Object.fromEntries(
      Object.entries({ ...DEFAULT_SETTINGS.section_goals, ...settings.section_goals })
        .map(([key, value]) => [key, Math.max(1, Math.round(Number(value) || 1))]),
    ) as Record<SectionKey, number>,
  };

  if (!isSupabaseConfigured || !supabase) {
    const data = getDemoData();
    data.settings = normalized;
    saveDemoData(data);
    return normalized;
  }

  const { data, error } = await supabase.from('user_settings').upsert(normalized).select('*').single();
  if (error) throw error;
  return data as UserSettings;
}

export function getRepositoryMode(): 'demo' | 'supabase' {
  return isSupabaseConfigured ? 'supabase' : 'demo';
}
