import { create } from 'zustand';
import { User, Survey, SonarImage, Detection, ModelRecord } from '../types';

interface AppState {
  user: User | null;
  activeTab: string;
  surveys: Survey[];
  currentSurvey: Survey | null;
  currentImage: SonarImage | null;
  detections: Detection[];
  activeModel: ModelRecord | null;
  isAssistantOpen: boolean;
  isCommandPaletteOpen: boolean;
  isChallengeOpen: boolean;
  isGlobeOpen: boolean;
  themeMode: 'dark' | 'sonar-high-contrast';
  notificationsCount: number;
  
  setUser: (user: User | null) => void;
  setActiveTab: (tab: string) => void;
  setSurveys: (surveys: Survey[]) => void;
  setCurrentSurvey: (survey: Survey | null) => void;
  setCurrentImage: (image: SonarImage | null) => void;
  setDetections: (detections: Detection[]) => void;
  setActiveModel: (model: ModelRecord | null) => void;
  setAssistantOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setChallengeOpen: (open: boolean) => void;
  setGlobeOpen: (open: boolean) => void;
  toggleThemeMode: () => void;
  setNotificationsCount: (count: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  activeTab: 'overview',
  surveys: [],
  currentSurvey: null,
  currentImage: null,
  detections: [],
  activeModel: null,
  isAssistantOpen: false,
  isCommandPaletteOpen: false,
  isChallengeOpen: false,
  isGlobeOpen: false,
  themeMode: 'dark',
  notificationsCount: 3,

  setUser: (user) => set({ user }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setSurveys: (surveys) => set({ surveys }),
  setCurrentSurvey: (currentSurvey) => set({ currentSurvey }),
  setCurrentImage: (currentImage) => set({ currentImage }),
  setDetections: (detections) => set({ detections }),
  setActiveModel: (activeModel) => set({ activeModel }),
  setAssistantOpen: (isAssistantOpen) => set({ isAssistantOpen }),
  setCommandPaletteOpen: (isCommandPaletteOpen) => set({ isCommandPaletteOpen }),
  setChallengeOpen: (isChallengeOpen) => set({ isChallengeOpen }),
  setGlobeOpen: (isGlobeOpen) => set({ isGlobeOpen }),
  toggleThemeMode: () =>
    set((state) => ({
      themeMode: state.themeMode === 'dark' ? 'sonar-high-contrast' : 'dark',
    })),
  setNotificationsCount: (notificationsCount) => set({ notificationsCount }),
}));
