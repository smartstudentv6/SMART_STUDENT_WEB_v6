
export interface CourseData {
  [courseName: string]: {
    es: string[];
    en: string[];
  };
}

export interface RawFaqItem {
  id: string;
  qKey: string;
  aKey: string;
}

export interface UserProfile {
  name: string;
  levelKey: string;
  activeCoursesKey: string;
  subjects: Array<{ tag: string; nameKey: string; colorClass: string }>; // e.g. { tag: "MAT", nameKey: "subjectMath" }
  evaluationsCompleted: number;
}

export interface SubjectProgress {
  nameKey: string;
  progress: number; // 0-100
  colorClass: string; // e.g. "bg-blue-500"
}

export interface EvaluationHistoryItem {
  id: string;
  date: string; // Could be Date object
  bookKey: string; // Key for translation
  topic: string;
  grade: string; // e.g. "90%"
  points: string; // e.g. "9/10"
}

    