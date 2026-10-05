/* Ashina V6 - themes.js (deobfuscated from themes.orig.js)
 * Content script declared in manifest.json: defines the THEMES color
 * dictionary (ashina-red, chesscom-green, pink, yellow) and
 * DEFAULT_THEME_KEY; consumers apply the --theme-* CSS variables. */
const THEMES = {
  "ashina-red": {
    label: "ASHINA RED",
    isDefault: true,
    colors: {
      "--theme-accent": "#ff0a2f",
      "--theme-accent-rgb": "255, 10, 47",
      "--theme-accent-dark": "#cc0820",
      "--theme-bg-main": "#000000",
      "--theme-bg-panel": "#111111",
      "--theme-bg-panel-alt": "#1a1a1a",
      "--theme-bg-hover": "#1a1a1a",
      "--theme-border": "#333333",
      "--theme-text-primary": "#ffffff",
      "--theme-text-secondary": "#444444",
      "--theme-text-muted": "#aaaaaa",
    },
  },
  "chesscom-green": {
    label: "CHESSCOM GREEN",
    isDefault: false,
    colors: {
      "--theme-accent": "#5d9948",
      "--theme-accent-rgb": "93, 153, 72",
      "--theme-accent-dark": "#457236",
      "--theme-bg-main": "#000000",
      "--theme-bg-panel": "#111111",
      "--theme-bg-panel-alt": "#1a1a1a",
      "--theme-bg-hover": "#1a1a1a",
      "--theme-border": "#333333",
      "--theme-text-primary": "#ffffff",
      "--theme-text-secondary": "#444444",
      "--theme-text-muted": "#aaaaaa",
    },
  },
  pink: {
    label: "PINK",
    isDefault: false,
    colors: {
      "--theme-accent": "#ff69b4",
      "--theme-accent-rgb": "255, 105, 180",
      "--theme-accent-dark": "#bf4e87",
      "--theme-bg-main": "#000000",
      "--theme-bg-panel": "#111111",
      "--theme-bg-panel-alt": "#1a1a1a",
      "--theme-bg-hover": "#1a1a1a",
      "--theme-border": "#333333",
      "--theme-text-primary": "#ffffff",
      "--theme-text-secondary": "#444444",
      "--theme-text-muted": "#aaaaaa",
    },
  },
  yellow: {
    label: "YELLOW",
    isDefault: false,
    colors: {
      "--theme-accent": "#ffff00",
      "--theme-accent-rgb": "255, 255, 0",
      "--theme-accent-dark": "#bfbf00",
      "--theme-bg-main": "#000000",
      "--theme-bg-panel": "#111111",
      "--theme-bg-panel-alt": "#1a1a1a",
      "--theme-bg-hover": "#1a1a1a",
      "--theme-border": "#333333",
      "--theme-text-primary": "#ffffff",
      "--theme-text-secondary": "#444444",
      "--theme-text-muted": "#aaaaaa",
    },
  },
};
const DEFAULT_THEME_KEY = "ashina-red";
