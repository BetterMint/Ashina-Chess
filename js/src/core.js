// ─── core.js · shared helpers, options bridge and global state ───
// Deobfuscated from the original bundle (original lines 1749–1959).
// `__awaiter` is a TypeScript compile helper; `ChromeRequest` and
// `getGradientColor` originate from BetterMint V2's Mint.js.
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      if (value instanceof P) {
        return value;
      } else {
        return new P(function (resolve) {
          resolve(value);
        });
      }
    }
    return new (P ||= Promise)(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        if (result.done) {
          resolve(result.value);
        } else {
          adopt(result.value).then(fulfilled, rejected);
        }
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var ChromeRequest = (function () {
  var requestId = 0;
  function getData(data) {
    var id = requestId++;
    return new Promise(function (resolve, reject) {
      function listener(evt) {
        if (evt.detail.requestId == id) {
          window.removeEventListener("BetterMintSendOptions", listener);
          resolve(evt.detail.data);
        }
      }
      window.addEventListener("BetterMintSendOptions", listener);
      const payload = {
        data: data,
        id: id,
      };
      window.dispatchEvent(new CustomEvent("BetterMintGetOptions", { detail: payload }));
    });
  }
  return { getData };
})();
function getGradientColor(startColor, endColor, percent) {
  startColor = startColor.replace(/^\s*#|\s*$/g, "");
  endColor = endColor.replace(/^\s*#|\s*$/g, "");
  if (startColor.length == 3) {
    startColor = startColor.replace(/(.)/g, "$1$1");
  }
  if (endColor.length == 3) {
    endColor = endColor.replace(/(.)/g, "$1$1");
  }
  var startRed = parseInt(startColor.substr(0, 2), 16);
  var startGreen = parseInt(startColor.substr(2, 2), 16);
  var startBlue = parseInt(startColor.substr(4, 2), 16);
  var endRed = parseInt(endColor.substr(0, 2), 16);
  var endGreen = parseInt(endColor.substr(2, 2), 16);
  var endBlue = parseInt(endColor.substr(4, 2), 16);
  var red = endRed - startRed;
  var green = endGreen - startGreen;
  var blue = endBlue - startBlue;
  red = (red * percent + startRed).toString(16).split(".")[0];
  green = (green * percent + startGreen).toString(16).split(".")[0];
  blue = (blue * percent + startBlue).toString(16).split(".")[0];
  if (red.length == 1) {
    red = "0" + red;
  }
  if (green.length == 1) {
    green = "0" + green;
  }
  if (blue.length == 1) {
    blue = "0" + blue;
  }
  return "#" + red + green + blue;
}
var enumOptions = {
  UrlApiStockfish: "option-url-api-stockfish",
  ApiStockfish: "option-api-stockfish",
  Depth: "option-depth",
  MultiPV: "option-multipv",
  ShowHints: "option-show-hints",
  MoveAnalysis: "option-move-analysis",
  DepthBar: "option-depth-bar",
  EvaluationBar: "option-evaluation-bar",
  DragonHash: "option-hash",
  DragonUciElo: "option-uci-elo",
  DragonPersonality: "option-personality",
  DragonLimitStrength: "option-limit-strength",
  DragonAutoSkill: "option-auto-skill",
  DragonOwnBook: "option-own-book",
  DragonChess960: "option-chess960",
  DragonBestBookLine: "option-best-book-line",
  DragonLimitBookMoves: "option-limit-book-moves",
  DragonBookMoves: "option-book-moves",
  ColorBestArrow: "option-color-best-arrow",
  ColorOtherArrow: "option-color-other-arrow",
  PredDepth: "option-pred-depth",
  HideArrows: "option-hide-arrows",
  HidePlayers: "option-hide-players",
  EngineSource: "option-engine-source",
  CoachEnabled: "option-coach-enabled",
  PreAnalyzeEnabled: "option-pre-analyze-enabled",
  CoachMoveFeedback: "option-coach-move-feedback",
  CoachAccuracy: "option-coach-accuracy",
  CoachDepth: "option-coach-depth",
  CoachVoice: "option-coach-voice",
  CoachLocale: "option-coach-locale",
  CoachVoiceEnabled: "option-coach-voice-enabled",
  CoachRecap: "option-coach-recap",
  AutoMoveEnabled: "option-automove-enabled",
  AutoMoveMin: "option-automove-min",
  AutoMoveMax: "option-automove-max",
  AutoMoveCenterWeight: "option-automove-centerweight",
  AutoStartNewGame: "option-autostart-newgame",
  FlagModeEnabled: "option-flag-mode-enabled",
  InstantRecapture: "option-instant-recapture",
  FastSimpleMoves: "option-fast-simple-moves",
  SimulateCheckmates: "option-simulate-checkmates",
  BlunderReactEnabled: "option-blunder-react",
  PremoveEnabled: "option-premove-enabled",
  AutoPremoveEnabled: "option-autopremove-enabled",
  AutoPremoveMatesEnabled: "option-autopremove-mates-enabled",
  AutoPremoveCheckingForkEnabled: "option-autopremove-checking-fork-enabled",
  MoveMethod: "option-move-method",
  SmartTimingProfile: "option-smart-timing-profile",
  CheckMoveEnabled: "option-checkmove-enabled",
  UltrabulletEnabled: "option-ultrabullet-enabled",
  UltrabulletMin: "option-ultrabullet-min",
  UltrabulletMax: "option-ultrabullet-max",
  UltrabulletPremoveChance: "option-ultrabullet-premove-chance",
  UltrabulletPremoveChainLimit: "option-ultrabullet-premove-chain-limit",
  UltrabulletCheckmoveChance: "option-ultrabullet-checkmove-chance",
  UltrabulletIgnoreCaptures: "option-ultrabullet-ignore-captures",
  UltrabulletIgnoreRecapture: "option-ultrabullet-ignore-recapture",
  UltrabulletReactToCheck: "option-ultrabullet-react-to-check",
  UltrabulletGuardQueen: "option-ultrabullet-guard-queen",
  UltrabulletFollowThroughAttack: "option-ultrabullet-follow-through-attack",
  UltrabulletFlagModeEnabled: "option-ultrabullet-flag-mode-enabled",
  UltrabulletOpeningPreference: "option-ultrabullet-opening-preference",
  UltrabulletLefongTrapChance: "option-ultrabullet-lefong-trap-chance",
};
// Global app state. `BetterMintmaster` and `eTable` are assigned once from
// init.js via the setters below; every other module reads the live binding.
export let BetterMintmaster;
// Declared in the original bundle but never read or written anywhere.
var Config = undefined;
var context = undefined;
// Opening-book FEN table (loaded from book/eco.json in init.js): every known
// book position's FEN maps to true, so the engine can prefer book moves.
export let eTable = null;
// Options snapshot used until the BetterMint master exists (early startup).
var tempOptions = {};
// Fetch the stored options as soon as the page loads, then keep the snapshot
// fresh whenever the popup broadcasts a change.
ChromeRequest.getData().then(function (options) {
  tempOptions = options;
});
window.addEventListener("BetterMintUpdateOptions", function (evt) {
  tempOptions = Object.assign({}, tempOptions, evt.detail);
});
// When ultrabullet mode is ON, these options are forced regardless of what the
// user configured — ultrabullet plays aggressive low-depth komodo with 5 lines.
const ULTRABULLET_ENGINE_OVERRIDES = {
  "option-engine-source": "komodo",
  "option-personality": "Aggressive",
  "option-depth": 2,
  "option-multipv": 5,
  "option-pred-depth": 8,
  "option-uci-elo": 3500,
  "option-hash": 64,
  "option-limit-strength": false,
  "option-auto-skill": false,
  "option-own-book": true,
  "option-chess960": false,
  "option-best-book-line": true,
  "option-limit-book-moves": false,
  "option-book-moves": 5,
  "option-opening-white-1": "none",
  "option-opening-white-2": "none",
  "option-opening-black-1": "none",
  "option-opening-black-2": "none",
};
// Ultrabullet mode always disables the normal auto-move (it has its own move loop).
const ULTRABULLET_AUTOMOVE_OVERRIDES = {
  "option-automove-enabled": false,
};
// Central option getter used by every module. Reads from the live master when
// it exists, otherwise from the startup snapshot. While ultrabullet mode is on,
// any key listed in the override tables returns the forced value instead.
function getValueConfig(key) {
  const value =
    BetterMintmaster == undefined
      ? tempOptions[key]
      : BetterMintmaster.options[key];
  if (key !== "option-ultrabullet-enabled") {
    const ultrabulletEnabled =
      BetterMintmaster == undefined
        ? tempOptions["option-ultrabullet-enabled"]
        : BetterMintmaster.options["option-ultrabullet-enabled"];
    if (ultrabulletEnabled) {
      if (
        Object.prototype.hasOwnProperty.call(ULTRABULLET_ENGINE_OVERRIDES, key)
      ) {
        return ULTRABULLET_ENGINE_OVERRIDES[key];
      }
      if (
        Object.prototype.hasOwnProperty.call(
          ULTRABULLET_AUTOMOVE_OVERRIDES,
          key,
        )
      ) {
        return ULTRABULLET_AUTOMOVE_OVERRIDES[key];
      }
    }
  }
  return value;
}
export function setBetterMintmaster(master) {
  BetterMintmaster = master;
}
export function setETable(map) {
  eTable = map;
}
export {
  __awaiter,
  ChromeRequest,
  getGradientColor,
  enumOptions,
  getValueConfig,
};
