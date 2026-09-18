import { supabase } from '@/integrations/supabase/client';

export type CreatorTrack = 'noir' | 'fret' | 'fret2';
export type CreatorRhythmPreset = 'slower' | 'normal' | 'faster';
export type CreatorResetInterval = '1' | '2' | '3' | '4' | 'end' | 'paragraph';

export interface CreatorImageMoment {
  id: string;
  storagePath: string;
  afterParagraph: number;
  focalX: number;
  alt?: string;
  url?: string;
}

export interface CreatorMusicDirection {
  kind: 'none' | 'kin' | 'upload';
  track?: CreatorTrack;
  storagePath?: string;
  filename?: string;
  rightsConfirmed?: boolean;
  url?: string;
}

export interface CreatorReadingDefaults {
  startSpeed: number;
  endSpeed: number;
  rhythmMode: boolean;
  rhythmPreset: CreatorRhythmPreset;
  accelerationMode: boolean;
  adaptiveSpeed: boolean;
  resetInterval: CreatorResetInterval;
}

export interface CreatorExperience {
  version: 1;
  publicationId?: string;
  images: CreatorImageMoment[];
  music: CreatorMusicDirection;
  defaults: CreatorReadingDefaults;
}

export const DEFAULT_CREATOR_EXPERIENCE: CreatorExperience = {
  version: 1,
  images: [],
  music: { kind: 'none' },
  defaults: {
    startSpeed: 0.5,
    endSpeed: 1.4,
    rhythmMode: true,
    rhythmPreset: 'normal',
    accelerationMode: false,
    adaptiveSpeed: true,
    resetInterval: '3',
  },
};

export function withCreatorExperienceDefaults(value?: Partial<CreatorExperience> | null): CreatorExperience {
  return {
    ...DEFAULT_CREATOR_EXPERIENCE,
    ...(value || {}),
    images: Array.isArray(value?.images) ? value!.images : [],
    music: { ...DEFAULT_CREATOR_EXPERIENCE.music, ...(value?.music || {}) },
    defaults: { ...DEFAULT_CREATOR_EXPERIENCE.defaults, ...(value?.defaults || {}) },
    version: 1,
  };
}

export async function resolveOwnCreatorExperienceMedia(experience: CreatorExperience): Promise<CreatorExperience> {
  const value = withCreatorExperienceDefaults(experience);
  const paths = [
    ...value.images.map((image) => image.storagePath).filter(Boolean),
    ...(value.music.kind === 'upload' && value.music.storagePath ? [value.music.storagePath] : []),
  ];

  if (!paths.length) return value;

  const { data, error } = await supabase.storage.from('creator-media').createSignedUrls(paths, 60 * 60 * 6);
  if (error) throw error;

  const byPath = new Map<string, string>();
  (data || []).forEach((entry: any, index: number) => {
    const path = paths[index];
    if (path && entry?.signedUrl) byPath.set(path, entry.signedUrl);
  });

  return {
    ...value,
    images: value.images.map((image) => ({
      ...image,
      url: byPath.get(image.storagePath) || image.url,
    })),
    music: value.music.kind === 'upload'
      ? { ...value.music, url: (value.music.storagePath ? byPath.get(value.music.storagePath) : undefined) || value.music.url }
      : value.music,
  };
}

export async function resolvePublishedCreatorExperience(
  publicationId: string,
  fallback?: CreatorExperience | null,
): Promise<CreatorExperience> {
  const { data, error } = await supabase.functions.invoke('creator-publication-media', {
    body: { publicationId },
  });
  if (error || !data?.success) {
    if (fallback) return withCreatorExperienceDefaults({ ...fallback, publicationId });
    throw error || new Error(data?.error || 'Could not load Creator media.');
  }
  return withCreatorExperienceDefaults({ ...(data.experience as CreatorExperience), publicationId });
}


export function stripCreatorExperienceUrls(experience: CreatorExperience): CreatorExperience {
  const value = withCreatorExperienceDefaults(experience);
  return {
    ...value,
    images: value.images.map(({ url: _url, ...image }) => image),
    music: value.music.kind === 'upload'
      ? (() => {
          const { url: _url, ...music } = value.music;
          return music;
        })()
      : value.music,
  };
}


function preloadImageUrl(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Creator image could not be loaded.'));
    image.src = url;
  });
}

export async function preloadCreatorImages(
  experience: CreatorExperience,
  strict = false,
): Promise<CreatorExperience> {
  const value = withCreatorExperienceDefaults(experience);
  const results = await Promise.all(
    value.images.map(async (image) => {
      if (!image.url) return { image, ok: false };
      try {
        await preloadImageUrl(image.url);
        return { image, ok: true };
      } catch {
        return { image, ok: false };
      }
    }),
  );

  const failed = results.filter((result) => !result.ok);
  if (strict && failed.length) {
    throw new Error('One of your images could not be prepared for preview. Remove it and add it again.');
  }

  return {
    ...value,
    images: results.filter((result) => result.ok).map((result) => result.image),
  };
}
