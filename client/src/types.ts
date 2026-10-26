export interface ConsoleCrumb { type: 'console'; level: 'log' | 'warn' | 'error'; message: string; timestamp: number }
export interface NetCrumb {
  type: 'fetch' | 'XMLHttpRequest'; method: string; url: string; status: number; ok: boolean;
  duration_ms: number; readyState?: number; timestamp: number;
}
export interface ClickCrumb { type: 'click'; tagName: string; id?: string; timestamp: number }
// Anything else (navigation, redux, future types) is rendered generically.
export interface GenericCrumb { type: string; timestamp: number; [k: string]: unknown }
export type Crumb = ConsoleCrumb | NetCrumb | ClickCrumb | GenericCrumb;

export interface Issue {
  id: string; title: string; topFrame: string; count: number;
  firstSeen: string; lastSeen: string; releases: string[];
}
export interface EventSummary { id: string; timestamp: string; release: string; userId?: string }
export interface SdkEvent {
  id: string; message: string; stack: string; unminifiedStack: string; release: string;
  timestamp: string; sizeKB: number; userId?: string; clientId?: string; buildId?: string;
  breadcrumbs: Crumb[];
}
export interface IssueQuery { search?: string; release?: string; from?: string; to?: string }
