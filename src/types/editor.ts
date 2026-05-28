export interface EditorFormData {
  // Problem
  pid: string;
  title: string;
  difficulty: string;
  tags: string[];
  link: string;

  // Submission
  language: string;
  code: string;

  // Progress
  masteryLevel: number;
  notes: string;
}

export interface ReviewTimelineEvent {
  id: string;
  type: "created" | "reviewed" | "submission" | string;
  rating: number | null;
  masteryBefore: number | null;
  masteryAfter: number | null;
  intervalBefore: number | null;
  intervalAfter: number | null;
  easinessBefore: number | null;
  easinessAfter: number | null;
  note: string | null;
  createdAt: string;
}

export type EditorUpdateHandler = <K extends keyof EditorFormData>(
  field: K,
  value: EditorFormData[K]
) => void;

export interface MetaSidebarProps {
  difficulty: string;
  tags: string[];
  link: string;
  masteryLevel: number;
  onUpdate: EditorUpdateHandler;
}

export interface QuestionEditorProps {
  mode: "create" | "edit";
  // clean data
  initialData?: Partial<EditorFormData>;
  preferredLang?: string;
  timelineEvents?: ReviewTimelineEvent[];
}

export interface EditorHeaderProps {
  pid: string;
  title: string;
  isSaving: boolean;
  mode: "create" | "edit";
  onUpdate: EditorUpdateHandler;
  onSave: () => void;
  onCancel: () => void;
}

export interface CodeSectionProps {
  code: string;
  language: string;
  onUpdate: EditorUpdateHandler;
}
