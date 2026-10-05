// coach/coaches.js - chess.com coach catalog (avatars, voices, taglines).
//
// Static catalog of the coach personas Ashina can speak through. Entries
// mirror chess.com's public coach assets: portraits/icons come from
// assets-coaches.chess.com, Rive avatar animations use chess.com .riv files,
// and taglines quote chess.com's pre-recorded intro lines (audioUrlHash keys
// into those clips), so each persona looks and sounds like its chess.com
// counterpart.
//
// Consumers:
//   - engine/coach-engine.js: resolves the active coach from the user's
//     CoachVoice setting via getValueConfig(enumOptions.CoachVoice) and reads
//     display name / taglines from the entry.
//   - coach/coach-audio.js: maps voiceId/id onto ElevenLabs voice assets and
//     emits `load-and-set-coach-asset` UCI commands to the engine.
//
// Entry schema (fields vary by entry vintage; older entries omit newer ones):
//   identity - name/titledName (display strings), analyticsId (analytics
//              label), country {id, name, code}
//   voice    - voiceId (ElevenLabs voice name), multiLocale (voice supports
//              non-English locales), id (ElevenLabs-style voice UUID),
//              textId (text/voice asset id; newer entries only)
//   visuals  - imageUrl/iconUrl (chess.com CDN portraits; newer assets carry
//              ?v= cache-busting params), riveAnimationUrl and
//              greetingRiveAnimationUrl (Rive animations; "" = none)
//   flags    - isCelebrity (real-world chess personality), coachId (numeric
//              chess.com coach id; legacy entries only)
//   taglines - [{ text, audioUrlHash }] intro lines plus the hash locating
//              each line's pre-recorded audio clip
export const ASHINA_COACHES = {
  // Coach David - default coach; Poland; multi-locale voice; legacy schema (no textId/rive/taglines).
  david: {
    voiceId: "David_coach",
    multiLocale: true,
    id: "377706c2-d0a4-11ee-b135-19f9e53c40f5",
    name: "David",
    titledName: "Coach David",
    analyticsId: "David",
    imageUrl: "https://assets-coaches.chess.com/image/coachdavid.png",
    iconUrl: "https://assets-coaches.chess.com/image/coachdavid-icon.png",
    country: {
      id: 112,
      name: "Poland",
      code: "PL"
    }
  },
  // Coach Mae - Japan; multi-locale voice; legacy schema (no textId/rive/taglines).
  mae: {
    voiceId: "Mae_coach",
    multiLocale: true,
    id: "3779595e-d0a4-11ee-a188-05b5e2276152",
    name: "Mae",
    titledName: "Coach Mae",
    analyticsId: "Mae",
    imageUrl: "https://assets-coaches.chess.com/image/coachmae.png",
    iconUrl: "https://assets-coaches.chess.com/image/coachmae-icon.png",
    country: {
      id: 78,
      name: "Japan",
      code: "JP"
    }
  },
  // Coach Dante - Canada; multi-locale voice; legacy schema (no textId/rive/taglines).
  dante: {
    voiceId: "Dante_coach",
    multiLocale: true,
    id: "37791f20-d0a4-11ee-b634-89fef0259834",
    name: "Dante",
    titledName: "Coach Dante",
    analyticsId: "Dante",
    imageUrl: "https://assets-coaches.chess.com/image/coachdante.png",
    iconUrl: "https://assets-coaches.chess.com/image/coachdante-icon.png",
    country: {
      id: 3,
      name: "Canada",
      code: "CA"
    }
  },
  // Coach Nadia - Turkiye; multi-locale voice; legacy schema (no textId/rive/taglines).
  nadia: {
    voiceId: "Nadia_coach",
    multiLocale: true,
    id: "3778e546-d0a4-11ee-803d-937400864b17",
    name: "Nadia",
    titledName: "Coach Nadia",
    analyticsId: "Nadia",
    imageUrl: "https://assets-coaches.chess.com/image/coachnadia.png",
    iconUrl: "https://assets-coaches.chess.com/image/coachnadia-icon.png",
    country: {
      id: 138,
      name: "Türkiye",
      code: "TR"
    }
  },
  // Coach Sloane - Australia; multi-locale voice; first entry with textId, Rive animations, and taglines.
  sloane: {
    voiceId: "Sloane_coach",
    multiLocale: true,
    id: "167864ce-ab73-11f0-8bbc-45df3aeaea91",
    textId: "Sloane_coach",
    name: "Sloane",
    titledName: "Coach Sloane",
    analyticsId: "Sloane",
    imageUrl: "https://assets-coaches.chess.com/image/coachsloane.png?v=6c448cfa",
    iconUrl: "https://assets-coaches.chess.com/image/coachsloane-icon.png?v=0a4c5293",
    country: {
      id: 17,
      name: "Australia",
      code: "AU"
    },
    riveAnimationUrl: "https://assets-coaches.chess.com/image/coach_sloane.riv?v=c3e13fe7",
    greetingRiveAnimationUrl: "https://assets-coaches.chess.com/image/coach_sloane_greeting.riv?v=efa3d5ef",
    taglines: [{
      text: "Hey, I’m Sloane. Choose me as your coach and I’ll teach you everything I know.",
      audioUrlHash: "a2b10a8003dcc3ab992476750cc6508f25bbe37c2b8b7482d682ee53af4f0fb7"
    }, {
      text: "My chess vision is up there with the greats. Ready to see what I see?",
      audioUrlHash: "d8d61000b04386e25d1650a47719c7050b62d4674430a67421588f1ce5bff93f"
    }, {
      text: "Want to build confidence while you learn? Pick me.",
      audioUrlHash: "b0f06747b5989f80ee3dda81defcceb4ea856c36ee7ea41200431d1a153238b1"
    }, {
      text: "I’m ready to guide you, move by move. Pick me and let’s learn some chess.",
      audioUrlHash: "04e4e3e1a7b065764d80e8b97b36b8774923bc06cca8de8fb732ce1c62c1b5f3"
    }]
  },
  // Coach Dr. Wolf - England (non-ISO "XE" country code); multi-locale voice; full Rive + taglines.
  drwolf: {
    voiceId: "Drwolf_coach",
    multiLocale: true,
    id: "167107ba-ab73-11f0-a6d9-3d00a545bfed",
    textId: "Drwolf_coach",
    name: "Dr. Wolf",
    titledName: "Coach Dr. Wolf",
    analyticsId: "DrWolf",
    imageUrl: "https://assets-coaches.chess.com/image/coachdrwolf.png?v=0f2770b3",
    iconUrl: "https://assets-coaches.chess.com/image/coachdrwolf-icon.png?v=de69116b",
    country: {
      id: 159,
      name: "England",
      code: "XE"
    },
    riveAnimationUrl: "https://assets-coaches.chess.com/image/coach_drwolf.riv?v=0584b8d3",
    greetingRiveAnimationUrl: "https://assets-coaches.chess.com/image/coach_drwolf_greeting.riv?v=55348ffd",
    taglines: [{
      text: "It would be my honor to guide you through this beautiful game.",
      audioUrlHash: "e674c460472aa128483cdd69f0e007eccdf1a41f34f53e1554875b597da87272"
    }, {
      text: "Under my tutelage, you’ll see the beauty of chess like never before.",
      audioUrlHash: "541d81a406ed9af0d4a4361eea042066f2644cb9c9ff1bd283e70fece4f1bffa"
    }, {
      text: "Chess teaches us about life, and I can teach you about chess.",
      audioUrlHash: "8cd77f2338bb6911e31bd302e1a4ea8526fe496efa2632f68d2bf00c9dee7123"
    }, {
      text: "We’re all students of the game. Though I’d love to be your teacher.",
      audioUrlHash: "425e6a3926c49c7c0669d728b1bbb6e18b9014ccf523ba193eb044d40f418b10"
    }]
  },
  // Coach Magnus - legacy shape: numeric coachId instead of id/textId, no Rive/taglines, no isCelebrity flag; single-locale voice.
  magnus: {
    voiceId: "Magnus_coach",
    multiLocale: false,
    coachId: 49,
    name: "Magnus",
    titledName: "Coach Magnus",
    analyticsId: "Magnus",
    imageUrl: "https://assets-coaches.chess.com/image/coachmagnus.png",
    iconUrl: "https://assets-coaches.chess.com/image/coachmagnus-icon.png",
    country: {
      id: 160,
      name: "Norway",
      code: "NO"
    }
  },
  // Coach Hikaru - legacy shape like magnus (coachId, no Rive/taglines, no isCelebrity flag); single-locale voice.
  hikaru: {
    voiceId: "Hikaru_coach",
    multiLocale: false,
    coachId: 50,
    name: "Hikaru",
    titledName: "Coach Hikaru",
    analyticsId: "Hikaru",
    imageUrl: "https://assets-coaches.chess.com/image/coachhikaru.png",
    iconUrl: "https://assets-coaches.chess.com/image/coachhikaru-icon.png",
    country: {
      id: 228,
      name: "United States",
      code: "US"
    }
  },
  // Coach Levy - celebrity (GothamChess per taglines); single-locale voice; full Rive + taglines.
  levy: {
    voiceId: "Levy_coach",
    multiLocale: false,
    id: "6ddf1ca2-ff6c-11ef-baea-5dc78a000edb",
    textId: "Levy_coach",
    name: "Levy",
    titledName: "Coach Levy",
    analyticsId: "Levy",
    imageUrl: "https://assets-coaches.chess.com/image/coachlevy.png?v=9f98615d",
    iconUrl: "https://assets-coaches.chess.com/image/coachlevy-icon.png?v=19825017",
    country: {
      id: 2,
      name: "United States",
      code: "US"
    },
    isCelebrity: true,
    riveAnimationUrl: "https://assets-coaches.chess.com/image/coach_levy.riv?v=21120709",
    greetingRiveAnimationUrl: "https://assets-coaches.chess.com/image/coach_levy_greeting.riv?v=38752839",
    taglines: [{
      text: "GothamChess here! I’m the internet’s chess teacher, who else could you possibly pick?",
      audioUrlHash: "b36a35b100e1ad842020b45f1bbcac3421b83588423e578ad1e2ffa245d259dd"
    }, {
      text: "Choose me as your coach and I’ll make you a better chess player!",
      audioUrlHash: "f0ee85ebd9cded2c4c233a4b33d0f40261987f035a4d9820f9b36a66a27e95a8"
    }, {
      text: "I’m just a chill guy who can improve your chess game. Pick me!",
      audioUrlHash: "14cd9bf73b06b4a5d46d703de37a0adcda2c93ff3f2e83cd9e0cd0bee7e3ca1b"
    }, {
      text: "Levy Rozman reporting for duty. I’m the best possible choice here, no clickbait.",
      audioUrlHash: "364aa165570aa0cbe4be362d0dea2c5aeb5611d0453679186f733899d36ba5d7"
    }]
  },
  // Coach Anna - Sweden; celebrity (popular chess YouTuber per taglines); full Rive + taglines.
  anna: {
    voiceId: "Anna_coach",
    multiLocale: false,
    id: "4fdf1a48-7917-11f0-83ed-d56e6dd5307c",
    textId: "Anna_coach",
    name: "Anna",
    titledName: "Coach Anna",
    analyticsId: "Anna",
    imageUrl: "https://assets-coaches.chess.com/image/coachanna.png?v=745c4e84",
    iconUrl: "https://assets-coaches.chess.com/image/coachanna-icon.png?v=ac97bcaa",
    country: {
      id: 132,
      name: "Sweden",
      code: "SE"
    },
    isCelebrity: true,
    riveAnimationUrl: "https://assets-coaches.chess.com/image/coach_anna.riv?v=4390de55",
    greetingRiveAnimationUrl: "https://assets-coaches.chess.com/image/coach_anna_greeting.riv?v=12d9fd31",
    taglines: [{
      text: "Hello from Sweden! Want to learn from one of the most popular chess YouTubers?",
      audioUrlHash: "37eb03999bac8f1688f4fd407acbbf74dc31d025b0a2e120ee76867064e11d1a"
    }, {
      text: "I’m Anna, and I’m here to make learning fun and easy.",
      audioUrlHash: "0178691a89ba37649fe2a13b0883b3a6d65fc6217fbe48acb4807db0558ba3d6"
    }, {
      text: "Let’s have some fun learning chess together. What do you say?",
      audioUrlHash: "6f6898a63e6c7376a8d583687d6aa8a4c1dc7942f880c9bbdcf09bdbe7211d09"
    }, {
      text: "I love chess! Let me teach you how to play the best game in the world.",
      audioUrlHash: "0afcf003a459ce263ec41acc868eba1a19786581ec5fb03bad07fc66e2840880"
    }]
  },
  // Coach Judit - Hungary; celebrity; Rive fields present but empty strings (no animation assets).
  judit: {
    voiceId: "Judit_coach",
    multiLocale: false,
    id: "c4106a5e-337d-11f1-b0fb-c9f8e5a66472",
    textId: "Judit_coach",
    name: "Judit",
    titledName: "Coach Judit",
    analyticsId: "Judit",
    imageUrl: "https://assets-coaches.chess.com/image/coachjudit.png?v=4e581e71",
    iconUrl: "https://assets-coaches.chess.com/image/coachjudit-icon.png?v=0fce7644",
    country: {
      id: 67,
      name: "Hungary",
      code: "HU"
    },
    isCelebrity: true,
    riveAnimationUrl: "",
    greetingRiveAnimationUrl: "",
    taglines: [{
      text: "Chess has given me skills I use every single day. I’d love to share what I’ve learned.",
      audioUrlHash: "b3967aeea4041b00be777b540ac6789b88e2b15d30fbae7838fc1ea10509316e"
    }, {
      text: "Practice, perseverance, and passion. That’s what chess taught me.",
      audioUrlHash: "072c05de5ff714b043ed96847c5fa95cc2ab7bf0fded278d7790ea1874d9ed5c"
    }, {
      text: "Ready to learn from the highest rated woman of all time?",
      audioUrlHash: "ded08d20246458ca53119b6d0c7342cb0cc59a7644c13e9da29c962014741cef"
    }, {
      text: "I was once the youngest grandmaster in chess history. Let me help you learn chess.",
      audioUrlHash: "2cb706410a580e8952dae5eb3523875542ccfdaf8ba2408085ccc2a652281ad0"
    }]
  },
  // Coach Vishy - India; celebrity; voiceId/textId say "Anand" while display name is "Vishy"; empty Rive URLs.
  vishy: {
    voiceId: "Anand_coach",
    multiLocale: false,
    id: "d62b1920-a0f1-11ef-ba68-b103c62ed2bc",
    textId: "Anand_coach",
    name: "Vishy",
    titledName: "Coach Vishy",
    analyticsId: "Vishy",
    imageUrl: "https://assets-coaches.chess.com/image/coachvishy.png?v=ea3d532d",
    iconUrl: "https://assets-coaches.chess.com/image/coachvishy-icon.png?v=9c622a35",
    country: {
      id: 69,
      name: "India",
      code: "IN"
    },
    isCelebrity: true,
    riveAnimationUrl: "",
    greetingRiveAnimationUrl: "",
    taglines: [{
      text: "I am Vishy Anand, the 5-time World Champion. Nice to meet you.",
      audioUrlHash: "d2689d438642593a08f47fd4835d930f6df87bcd57e0ad3415ceeb239dd48ec1"
    }, {
      text: "Pick me to take your game to the next level.",
      audioUrlHash: "e26c17c481882a068753bff37b7a5d4dde7854350e550aa9a3ac8bcf89be3afe"
    }, {
      text: "Let me help you get better at this lovely game! Take it from a World Champion.",
      audioUrlHash: "cf32d8ee814e63f65740039ca2d010e679865687b2667649b135f3f518cfedbc"
    }, {
      text: "Vishy Anand, naam to suna hi hoga.",
      audioUrlHash: "568bc7ee87aab52a130827498d9fe70e7be009329169ac62ff3dc621cbf752ea"
    }]
  },
  // Coach Botez - the Botez Sisters (analyticsId differs from entry name); full Rive + taglines.
  botez: {
    voiceId: "Botez_coach",
    multiLocale: false,
    id: "d62a2aba-a0f1-11ef-a2f0-9118eb9f958d",
    textId: "Botez_coach",
    name: "Botez",
    titledName: "Coach Botez",
    analyticsId: "Botez Sisters",
    imageUrl: "https://assets-coaches.chess.com/image/coachbotezsisters.png?v=794138d4",
    iconUrl: "https://assets-coaches.chess.com/image/coachbotezsisters-icon.png?v=8824e754",
    country: {
      id: 2,
      name: "United States",
      code: "US"
    },
    isCelebrity: true,
    riveAnimationUrl: "https://assets-coaches.chess.com/image/coach_botez.riv?v=ce5847dc",
    greetingRiveAnimationUrl: "https://assets-coaches.chess.com/image/coach_botez_greeting.riv?v=1c071485",
    taglines: [{
      text: "Recognize us from YouTube? We’ll make you a better chess player!",
      audioUrlHash: "26d978719bebb2b2c0dd6c558932ce76b77aef5d5e700e8262c57a9ca28fc5a1"
    }, {
      text: "Double trouble! We can help you achieve chess glory.",
      audioUrlHash: "d9dbca669e1ecf98fdd9ca5e48c2fad9bbe44c19871d3393c0942086a571e83c"
    }, {
      text: "Want TWO chess coaches instead of one? We’re the right choice.",
      audioUrlHash: "17f6652dcb38d254525c8e787589cbc1a927fb083353d954e56b32bf8854a83a"
    }, {
      text: "Alexandra and Andrea here! You’d be a FOOL not to pick us!",
      audioUrlHash: "0e9bbd8c90284fce7385adf07a745c340b29d88434f6feecc73b30bc3dd35446"
    }]
  },
  // Coach Ben - US celebrity GM; empty Rive URLs.
  ben: {
    voiceId: "Ben_coach",
    multiLocale: false,
    id: "6dde8ddc-ff6c-11ef-a8d2-d5eb2eeec084",
    textId: "Ben_coach",
    name: "Ben",
    titledName: "Coach Ben",
    analyticsId: "Ben",
    imageUrl: "https://assets-coaches.chess.com/image/coachben.png?v=80369bf7",
    iconUrl: "https://assets-coaches.chess.com/image/coachben-icon.png?v=b27b2f23",
    country: {
      id: 2,
      name: "United States",
      code: "US"
    },
    isCelebrity: true,
    riveAnimationUrl: "",
    greetingRiveAnimationUrl: "",
    taglines: [{
      text: "Hey, it’s Ben. You can pick me if you want, but I’ll probably make fun of your blunders.",
      audioUrlHash: "f97764e9163395c49e103ebc2366ddfacfa8ae12bf56428697789e02701fdb9f"
    }, {
      text: "If you pick me, you may learn a thing or two. I am a grandmaster after all.",
      audioUrlHash: "061e36df97a1e330252c842168034958803803af2173402815622e20e8c83903"
    }, {
      text: "Trust me, you’ll want me as your coach. The horsey goes diagonally, right?",
      audioUrlHash: "b4f71b3595e0ec9c992edd91c1b4a1a0a75baf08dcfbdaaab12ff3b0ef994391"
    }, {
      text: "You’re thinking about picking me? Think twice, bucko.",
      audioUrlHash: "03cf87a5f7572b20ffd3661e8064a0f599595ab48b1924cf9290f1a74d4a04ae"
    }]
  },
  // Coach Canty - US celebrity (chessboxing world champ per taglines); empty Rive URLs.
  canty: {
    voiceId: "Canty_coach",
    multiLocale: false,
    id: "d62b98a0-a0f1-11ef-bf0b-b5dcb6c5161b",
    textId: "Canty_coach",
    name: "Canty",
    titledName: "Coach Canty",
    analyticsId: "Canty",
    imageUrl: "https://assets-coaches.chess.com/image/coachcanty.png?v=fe8bc7a2",
    iconUrl: "https://assets-coaches.chess.com/image/coachcanty-icon.png?v=20e7d9f0",
    country: {
      id: 2,
      name: "United States",
      code: "US"
    },
    isCelebrity: true,
    riveAnimationUrl: "",
    greetingRiveAnimationUrl: "",
    taglines: [{
      text: "Want to spar with a chessboxing world champ? I’m your man.",
      audioUrlHash: "7f8c5e1531f95ff5222d02b21976659615f8fc8abd6c223483865572efb3e6f5"
    }, {
      text: "I’m a titled chess player, popular streamer, and your next chess coach.",
      audioUrlHash: "61844de18c921a7c198bed711030fd991216117cc91a7db83bc987625ed5c8a2"
    }, {
      text: "BOOM! I got you with all the tips and tricks if you pick me as your coach.",
      audioUrlHash: "59a408724ab3d6732020bd5defeb94ab9005ef76d0bd0786fe04a17df7b3e8fe"
    }, {
      text: "If you pick me as your coach I’ll teach you all the tactinos and gambinos that make a great player.",
      audioUrlHash: "a8d7874d422ebb0492130a3718536111ec2aee2ff61efc53cc7cc8e9c412ae66"
    }]
  },
  // Coach Ruben - Cuba; empty Rive URLs; no isCelebrity flag despite persona taglines.
  ruben: {
    voiceId: "Ruben_coach",
    multiLocale: false,
    id: "167962e8-ab73-11f0-8281-4de448a78c1a",
    textId: "Ruben_coach",
    name: "Ruben",
    titledName: "Coach Ruben",
    analyticsId: "Ruben",
    imageUrl: "https://assets-coaches.chess.com/image/coachruben.png?v=a50e65f4",
    iconUrl: "https://assets-coaches.chess.com/image/coachruben-icon.png?v=87a78d9c",
    country: {
      id: 37,
      name: "Cuba",
      code: "CU"
    },
    riveAnimationUrl: "",
    greetingRiveAnimationUrl: "",
    taglines: [{
      text: "Want to learn chess from a park hustler? Choose me.",
      audioUrlHash: "f20c93c8dd6fc31bf8d2e2ffcbedde47c407752671d2885ab28b1a8bbde07fc8"
    }, {
      text: "Stick with me, and I’ll teach you a thing or two about chess and trash talking.",
      audioUrlHash: "8e2078128996e7754bfac61e72a25fba9b0f193e38d9e25c060585fd491fbfd0"
    }, {
      text: "Ready for some expert coaching? Let’s do it.",
      audioUrlHash: "5015d396ed4354ce9e0811973b0499e66fa87c64f233081010b0a4ddd218a766"
    }, {
      text: "Choose me, and watch your chess rating skyrocket! It’s simple.",
      audioUrlHash: "1411caad304cb3407918f0e3239a26d2db27d1faa1dba1b49d4799afb213d253"
    }]
  },
  // Coach Calvin - US; empty Rive URLs; no isCelebrity flag.
  calvin: {
    voiceId: "Calvin_coach",
    multiLocale: false,
    id: "1678e624-ab73-11f0-9644-6fc23344afd8",
    textId: "Calvin_coach",
    name: "Calvin",
    titledName: "Coach Calvin",
    analyticsId: "Calvin",
    imageUrl: "https://assets-coaches.chess.com/image/coachcalvin.png?v=2fa90df5",
    iconUrl: "https://assets-coaches.chess.com/image/coachcalvin-icon.png?v=730ed413",
    country: {
      id: 2,
      name: "United States",
      code: "US"
    },
    riveAnimationUrl: "",
    greetingRiveAnimationUrl: "",
    taglines: [{
      text: "You need an expert chess coach? Say no more.",
      audioUrlHash: "7ce3682d495ecec0536dc32f6445a6814a527d369d3872c78f7b37aa858e9731"
    }, {
      text: "I’m the best chess player in my school. Ready to learn?",
      audioUrlHash: "fcb3f2e9e3f1fc2ce88b39f965088f9cfe3451da888788ecd1de162da5463fcd"
    }, {
      text: "I’m the coach you want in your corner. Let’s do this.",
      audioUrlHash: "0a14582301c14e9b7b56a0fb20cfce290bb21e43f5719ffdd4447db567799a23"
    }, {
      text: "Are we standing around or are we playing chess? C’mon!",
      audioUrlHash: "c7d519fde47bc45b1bb9425d18bc6e581cbe7419805c3a0766d2b5c446589a47"
    }]
  },
  // Coach Tania - India; celebrity (commentator, Olympiad gold per taglines); empty Rive URLs.
  tania: {
    voiceId: "Tania_coach",
    multiLocale: false,
    id: "d62aa12a-a0f1-11ef-8c86-0b794ad057db",
    textId: "Tania_coach",
    name: "Tania",
    titledName: "Coach Tania",
    analyticsId: "Tania",
    imageUrl: "https://assets-coaches.chess.com/image/coachtania.png?v=dc1e4f9f",
    iconUrl: "https://assets-coaches.chess.com/image/coachtania-icon.png?v=271636b6",
    country: {
      id: 69,
      name: "India",
      code: "IN"
    },
    isCelebrity: true,
    riveAnimationUrl: "",
    greetingRiveAnimationUrl: "",
    taglines: [{
      text: "I’ve commentated on the best in the world. Now I’m here to help you play like them!",
      audioUrlHash: "91581b8ddbb50042a22d52e8702d8f3c9060c545fd20b413069c631f3114c63c"
    }, {
      text: "Want to learn chess from an Olympiad gold medalist? Pick me.",
      audioUrlHash: "92388d370eeec75aef641267e8ecc78499c4749b233dd7b52c2824b468407b21"
    }, {
      text: "Coach Tania here! I can help you become a better chess player!",
      audioUrlHash: "381a903056cac3a440df8780ca6ec4e726a5b591a8e90d42d7f37ad0eaefcc8f"
    }, {
      text: "It’s Tania. You’re going to want to be my student. Trust me!",
      audioUrlHash: "57cdbda82e9abe2fd695621285d67c9a7b7ab76083663f0d449c55cbd3aa4c54"
    }]
  },
  // Coach Danny - US celebrity (Chess.com Chief Chess Officer per taglines); empty Rive URLs.
  danny: {
    voiceId: "Danny_coach",
    multiLocale: false,
    id: "6dd9d7b0-ff6c-11ef-9341-ff6621b6b8b5",
    textId: "Danny_coach",
    name: "Danny",
    titledName: "Coach Danny",
    analyticsId: "Danny",
    imageUrl: "https://assets-coaches.chess.com/image/coachdanny.png?v=7fd13701",
    iconUrl: "https://assets-coaches.chess.com/image/coachdanny-icon.png?v=2fc4419f",
    country: {
      id: 2,
      name: "United States",
      code: "US"
    },
    isCelebrity: true,
    riveAnimationUrl: "",
    greetingRiveAnimationUrl: "",
    taglines: [{
      text: "Want to learn from Chess.com’s Chief Chess Officer?",
      audioUrlHash: "331029009912d371cbaee9aad487a2402e3cc9ea6e08135946c66a489ad35a84"
    }, {
      text: "Have no fear, Coach Danny is here! I’ll teach you everything you need to know.",
      audioUrlHash: "dabbc9e92028d617bce30a421c8fd8a14742794ac98d255a9632e37c58829016"
    }, {
      text: "Nice job finding my avatar, now click the big green button. You’re so close. You can do this.",
      audioUrlHash: "7cfa01dff35858df653ae1dcc00a0cf6916affeda8eb6b7d111cfd83483c53e9"
    }, {
      text: "Improve your game with tips from me, a world-class chess commentator.",
      audioUrlHash: "e1f1f1e5bf7c885c922f5af5c883e33510ae4d18951c7c06b68491b27a38c7f9"
    }]
  }
};
