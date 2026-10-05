// ─── coach/coach-audio.js · chess.com coach voice/asset URL helpers ───
const LOCALE_TO_LANG = {
  "en-US": "en_US",
  "fr-FR": "fr_FR",
  "es-ES": "es_ES",
  "de-DE": "de_DE",
  "it-IT": "it_IT",
  "pt-PT": "pt_PT",
  "tr-TR": "tr_TR",
  "ru-RU": "ru_RU",
  "ar-SA": "ar_SA",
  "pl-PL": "pl_PL",
  "ko-KR": "ko_KR",
  "id-ID": "id_ID"
};
function buildAudioBase(coach, locale) {
  return "https://text-and-audio.chess.com/prod/released/" + coach.voiceId + "/" + locale + "/";
}
function buildCoachCmd(coach, locale) {
  const coachId = coach.id ?? coach.coachId ?? null;
  const textId = coach.textId || "Generic_coach";
  const coachAsset = {
    id: coachId,
    name: coach.name,
    titledName: coach.titledName,
    voiceId: coach.voiceId,
    locale: "en-US",
    textId: textId,
    analyticsId: coach.analyticsId,
    imageUrl: coach.imageUrl,
    iconUrl: coach.iconUrl,
    country: coach.country,
    taglines: coach.taglines || [],
    i18nMeta: {
      languageIndicator: ""
    },
    riveAnimationUrl: coach.riveAnimationUrl || "",
    greetingRiveAnimationUrl: coach.greetingRiveAnimationUrl || ""
  };
  const coachJson = JSON.stringify(coachAsset);
  return "load-and-set-coach-asset text_id " + textId + " locale " + locale + " json {\"currentCoach\":" + coachJson + "}";
}
export { LOCALE_TO_LANG, buildAudioBase, buildCoachCmd };