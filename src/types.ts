export interface SourceDocument {
  id: string;
  type: "text" | "url";
  title: string;
  content: string;
  url?: string;
  charCount: number;
  addedAt: Date;
}

export interface PodcastScriptLine {
  id: string; // Unique ID to track in list & audio
  speaker: string;
  text: string;
  audioBase64?: string; // Cache base64 raw PCM (or data URL once stitched)
  isSynthesizing?: boolean;
  isSynthesized?: boolean;
  error?: string;
}

export interface PodcastEpisode {
  title: string;
  description: string;
  script: PodcastScriptLine[];
}

export interface HostConfig {
  name: string;
  voice: "Kore" | "Puck" | "Fenrir" | "Charon" | "Zephyr";
  toneDescription: string;
}

export interface PodcastMetadata {
  tags: string[];
  showNotes: string;
  chapterMarkers: { timestamp: string; title: string }[];
  topicsUsed?: string[];
}

export type GenerationLength = "short" | "medium" | "long" | "10_mins";

export interface ExportPlatform {
  id: string;
  name: string;
  icon: string;
  status: "idle" | "exporting" | "success" | "error";
  progress: number;
  instruction: string;
  exportedUrl?: string;
}
