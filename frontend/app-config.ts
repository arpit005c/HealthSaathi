export interface AppConfig {
  pageTitle: string;
  pageDescription: string;
  companyName: string;

  supportsChatInput: boolean;
  supportsVideoInput: boolean;
  supportsScreenShare: boolean;
  isPreConnectBufferEnabled: boolean;

  logo: string;
  startButtonText: string;
  accent?: string;
  logoDark?: string;
  accentDark?: string;

  audioVisualizerType?: 'bar' | 'wave' | 'grid' | 'radial' | 'aura';
  audioVisualizerColor?: `#${string}`;
  audioVisualizerColorDark?: `#${string}`;
  audioVisualizerColorShift?: number;
  audioVisualizerBarCount?: number;
  audioVisualizerGridRowCount?: number;
  audioVisualizerGridColumnCount?: number;
  audioVisualizerRadialBarCount?: number;
  audioVisualizerRadialRadius?: number;
  audioVisualizerWaveLineWidth?: number;

  // agent dispatch configuration
  agentName?: string;

  // LiveKit Cloud Sandbox configuration
  sandboxId?: string;
}

export const APP_CONFIG_DEFAULTS: AppConfig = {
  companyName: 'HealthSaathi',
  pageTitle: 'HealthSaathi | AI Voice Health Assistant',
  pageDescription:
    'Your secure, multilingual AI voice assistant for health and wellness consultations.',

  supportsChatInput: true,
  supportsVideoInput: true,
  supportsScreenShare: true,
  isPreConnectBufferEnabled: true,

  logo: '/murf-logo.svg',
  accent: '#0284c7', // Medical Blue
  logoDark: '/murf-logo-dark.svg',
  accentDark: '#38bdf8', // Light Medical Blue
  startButtonText: 'Start Consultation',

  // HealthSaathi Medical Visualizer (EKG/Wave style)
  audioVisualizerType: 'wave',
  audioVisualizerColor: '#0284c7', // Medical blue for light mode
  audioVisualizerColorDark: '#34d399', // Calming emerald for dark mode
  audioVisualizerWaveLineWidth: 3,
  audioVisualizerColorShift: 0.1, // Subtle calming shift

  // agent dispatch configuration
  agentName: process.env.AGENT_NAME ?? undefined,

  // LiveKit Cloud Sandbox configuration
  sandboxId: undefined,
};
