export type ThemePreference = 'system' | 'light' | 'dark';
export type ThemeState = {preference: ThemePreference; resolved: 'light' | 'dark'};
export type ThemeController = {state(): ThemeState; choose(value: ThemePreference): void; cycle(): void; destroy(): void};
export const themeOrder: ThemePreference[];
export const themePaths: Record<ThemePreference, string>;
export function themeLabel(preference: ThemePreference, locale?: string): string;
export function paintThemeButton(button: HTMLElement | null, state: ThemeState, locale?: string): void;
export function createThemeController(options: {storageKey: string; onChange?: (state: ThemeState) => void; colors?: Record<'light' | 'dark', string>}): ThemeController;
