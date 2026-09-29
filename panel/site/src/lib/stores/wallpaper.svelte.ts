import defaultWallpaper from '$lib/assects/wallpaper/snowy-mountain-sunset.jpg';

export interface WallpaperConfig {
  url: string;
  tint: number; // 0.0 to 1.0 (black overlay opacity)
  blur: number; // in pixels
}

const STORAGE_KEY = 'hex_user_wallpaper';

// ============================================================================
// GLOBAL DEVELOPER DEFAULTS (Change here to set default wallpaper tint globally)
// ============================================================================
export const GLOBAL_DEFAULT_TINT = 0.60; // 0.0 (clean image) to 1.0 (pure black overlay)
export const GLOBAL_DEFAULT_BLUR = 0;    // default blur in pixels

function loadInitial(): WallpaperConfig {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
  }
  return {
    url: defaultWallpaper,
    tint: GLOBAL_DEFAULT_TINT,
    blur: GLOBAL_DEFAULT_BLUR
  };
}

let configState = $state<WallpaperConfig>(loadInitial());

export const wallpaperStore = {
  get url() {
    return configState.url;
  },
  get tint() {
    return configState.tint;
  },
  get blur() {
    return configState.blur;
  },
  setWallpaper(url: string) {
    configState.url = url;
    this.save();
  },
  setTint(tint: number) {
    configState.tint = Math.max(0, Math.min(1, tint));
    this.save();
  },
  setBlur(blur: number) {
    configState.blur = Math.max(0, blur);
  },
  save() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(configState));
      } catch {}
    }
  },
  reset() {
    configState = {
      url: defaultWallpaper,
      tint: 0.45,
      blur: 0
    };
    this.save();
  }
};
