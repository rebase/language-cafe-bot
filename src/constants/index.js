/* eslint-disable no-multi-spaces */
export const COLORS = {
  PRIMARY: 0xc3c3e5,
};

// Anyone can access these.
export const GENERAL_CHANNELS = {
  customize: 'customize-community',
  faq: '807590113974026240',
  introductions: '739914668767707227',
  generalTable: '739912851904528414',
  findExchangePartner: '788764507857879041',
  findStudyBuddy: '1230684714415820890',
  exchangeBuddyLounge: '1446946021845237890',
  eventCalendar: '1001846824577007707',
  resourceDrawer: '1102680206755496037',
  journal: '1257059316398030939',
  publicServerHelp: '739915203096870917',
  privateServerHelp: '815396406965698631',
};

// NOTE: If the names of the roles change, then the role-based maps here
// will break for those roles.

// Used in "Explore Your Interests"
export const RECREATIONAL_CHANNELS = {
  'Book Club': '904704521580707890', // Recreation Lounge  -> book-club
  Creatives: '739915357388669050', // Recreation Lounge  -> creative-corner
  Games: '739915551731744811', // Recreation Lounge  -> arcade
  Humanities: '937830159761948772', // Recreation Lounge  -> humanities-table
  Kitchen: '806955829680930878', // Recreation Lounge  -> kitchen
  STEM: '815686754652520499', // Recreation Lounge  -> stem-lab
  Music: '739915454591795332', // Recreation Lounge  -> jukebox
  Media: '937835736651157585', // Recreation Lounge  -> tv-and-media-room
  Wellness: '815686807513464873', // Recreation Lounge  -> wellness-table
};

// Used in "Community & Language Activities"
export const COMMUNITY_CHANNELS = {
  Promotions: '1411441347436613652', // Information Station -> promotions
  Announcements: '739914487724769380', // Information Station -> cafe-announcements
  'Server-Wide Events': '805738123853430805', // Server-wide Events  -> server-wide-events
  Challenger: '1422215870444343337', // Study Lounge        -> challenge-lounge
  'Study Table': '739915489785937941', // Study Lounge        -> study-table
  'Language Jam': '1008597469661241345', // Server-wide Events  -> language-jam
  Conlang: '785071174827638804', // Linguistics         -> conlang-table
  Linguistics: '739915518085169282', // Linguistics         -> linguistics-table

  // Specifically `Pass the Coffee Cup`. Users can probably figure out that
  // there are more word games available.
  'Word Games': '1160816895633657856', // Word Games          -> pass-the-coffee-cup
};

export const LANGUAGE_CHANNELS = {
  Albanian: '1002715002244956280',
  'American Indigenous': '1124231411386290266',
  Arabic: '804789226020798475',
  'Ancient Languages': '815684121346179073',
  'Austronesian Other': '1035995287585570847',
  'Balto-Slavic Other': '1008016066355666984',
  Cantonese: '1002721914768334848',
  Celtic: '927560298389450812',
  Creole: '1124231459717255239',
  Czech: '1002716479600480306',
  Danish: '1002722091239473202',
  Dutch: '804791034030456852',
  English: '739913653373108276',
  Filipino: '783679036081700944',
  Finnish: '937823692489113611',
  French: '739913329539153950',
  German: '739913597064577084',
  'Germanic Other': '1002716261521830028',
  Greek: '868623416591261716',
  Hebrew: '1002720634830327808',
  'Hindi-Urdu': '1002716048509915146',
  Hungarian: '1002719968611270667',
  Icelandic: '1002721308590747731',
  'Indo-Iranian Other': '1008022941981757560',
  Italian: '788488973080330300',
  Japanese: '739913747459604540',
  Korean: '782981404954591293',
  Latin: '868623221530980362',
  Lithuanian: '1421546022240387072',
  Mandarin: '739913704199684156',
  'Malay-Indonesian': '1035995239736934502',
  Norwegian: '868623005931167785',
  Other: '759520892539109457',
  Polish: '915638625801224222',
  Portuguese: '804792223887261727',
  'Romance Other': '1002716177732214915',
  Romanian: '759520441642909736',
  Russian: '783678707436355594',
  'Semitic Other': '1008017465315442708',
  'Sign Languages': '1002739140749705396',
  Spanish: '739913415522516992',
  Swedish: '947762339774595084',
  'Serbo-Croat': '1002712117675311184',
  Thai: '1124230007829581897',
  Turkish: '1002711185965199501',
  Ukranian: '1019870489184841748',
  Vietnamese: '1279361929235791883',
};

export const ALL_LANGUAGES = Object.keys(LANGUAGE_CHANNELS);

// All the languages on the website.
export const WEBSITE_LANGUAGES_URL_TO_NAME = {
  afrikaans: 'Afrikaans',
  akan: 'Akan',
  albanian: 'Albanian',
  amharic: 'Amharic',
  'ancient-greek': 'Ancient Greek',
  arabic: 'Arabic',
  aramaic: 'Aramaic (Modern)',
  armenian: 'Armenian',
  assamese: 'Assamese',
  aymara: 'Aymara',
  azerbaijani: 'Azerbaijani',
  basque: 'Basque',
  belarusian: 'Belarusian',
  bengali: 'Bengali',
  bhojpuri: 'Bhojpuri',
  breton: 'Breton',
  bulgarian: 'Bulgarian',
  burmese: 'Burmese',
  cantonese: 'Cantonese',
  catalan: 'Catalan',
  cebuano: 'Cebuano',
  cherokee: 'Cherokee',
  coptic: 'Coptic',
  cree: 'Cree',
  czech: 'Czech',
  danish: 'Danish',
  dhivehi: 'Dhivehi (Maldivian)',
  dutch: 'Dutch',
  dzongkha: 'Dzongkha',
  english: 'English',
  estonian: 'Estonian',
  faroese: 'Faroese',
  finnish: 'Finnish',
  french: 'French',
  frisian: 'Frisian',
  galician: 'Galician',
  georgian: 'Georgian',
  german: 'German',
  'greek-(modern)': 'Greek (Modern)',
  greenlandic: 'Greenlandic',
  guaraní: 'Guaraní',
  gujarati: 'Gujarati',
  'haitian-creole': 'Haitian Creole',
  hawaiian: 'Hawaiian',
  hebrew: 'Hebrew',
  hiligaynon: 'Hiligaynon (Ilonggo)',
  hindi: 'Hindi',
  hmong: 'Hmong',
  hokkien: 'Hokkien',
  hungarian: 'Hungarian',
  icelandic: 'Icelandic',
  igbo: 'Igbo',
  ilocano: 'Ilocano',
  inuktitut: 'Inuktitut',
  irish: 'Irish',
  italian: 'Italian',
  japanese: 'Japanese',
  javanese: 'Javanese',
  kannada: 'Kannada',
  kazakh: 'Kazakh',
  khmer: 'Khmer',
  korean: 'Korean',
  kurdish: 'Kurdish',
  kyrgyz: 'Kyrgyz',
  lao: 'Lao',
  latin: 'Latin',
  latvian: 'Latvian',
  lithuanian: 'Lithuanian',
  luxembourgish: 'Luxembourgish',
  macedonian: 'Macedonian',
  malagasy: 'Malagasy',
  'malay-indonesian': 'Malay-Indonesian',
  malayalam: 'Malayalam',
  maltese: 'Maltese',
  mandarin: 'Mandarin',
  marathi: 'Marathi',
  mongolian: 'Mongolian',
  māori: 'Māori',
  nahuatl: 'Nahuatl',
  navajo: 'Navajo',
  nepali: 'Nepali',
  norwegian: 'Norwegian',
  occitan: 'Occitan',
  odia: 'Odia',
  ojibwe: 'Ojibwe (Anishinaabemowin)',
  'old-church-slavonic': 'Old Church Slavonic',
  papiamento: 'Papiamento',
  pashto: 'Pashto',
  persian: 'Persian',
  polish: 'Polish',
  portuguese: 'Portuguese',
  punjabi: 'Punjabi',
  quechua: 'Quechua',
  romanian: 'Romanian',
  romansh: 'Romansh',
  russian: 'Russian',
  samoan: 'Samoan',
  sanskrit: 'Sanskrit',
  'scottish-gaelic': 'Scottish Gaelic',
  'serbo-croatian': 'Serbo-Croatian',
  sesotho: 'Sesotho',
  shanghainese: 'Shanghainese',
  shona: 'Shona',
  sinhala: 'Sinhala',
  slovak: 'Slovak',
  slovene: 'Slovene',
  somali: 'Somali',
  spanish: 'Spanish',
  sundanese: 'Sundanese',
  swahili: 'Swahili',
  swazi: 'Swazi',
  swedish: 'Swedish',
  sámi: 'Sámi',
  tagalog: 'Tagalog',
  tahitian: 'Tahitian',
  tamazight: 'Tamazight (Amazigh)',
  tamil: 'Tamil',
  telugu: 'Telugu',
  thai: 'Thai',
  tibetan: 'Tibetan',
  'tok-pisin': 'Tok Pisin',
  tongan: 'Tongan',
  tswana: 'Tswana',
  turkish: 'Turkish',
  turkmen: 'Turkmen',
  ukrainian: 'Ukrainian',
  urdu: 'Urdu',
  uzbek: 'Uzbek',
  vietnamese: 'Vietnamese',
  welsh: 'Welsh',
  wolof: 'Wolof',
  xhosa: 'Xhosa',
  yiddish: 'Yiddish',
  yoruba: 'Yoruba',
  zulu: 'Zulu',
};

export const WEBSITE_LANGUAGES_URL = Object.keys(WEBSITE_LANGUAGES_URL_TO_NAME);

export const LANGUAGE_ALIASES = {
  // Chinese
  chinese: 'mandarin',
  'mandarin chinese': 'mandarin',
  'simplified chinese': 'mandarin',
  zh: 'mandarin',
  'zh cn': 'mandarin',

  // English
  en: 'english',

  // Spanish
  espanol: 'spanish',
  castellano: 'spanish',
  es: 'spanish',

  // Portuguese
  portugues: 'portuguese',
  pt: 'portuguese',
  'pt br': 'portuguese',

  // French
  francais: 'french',
  fr: 'french',

  // German
  deutsch: 'german',
  de: 'german',

  // Japanese
  nihongo: 'japanese',
  jp: 'japanese',
  ja: 'japanese',

  // Korean
  hangul: 'korean',
  ko: 'korean',
  kr: 'korean',

  // Arabic
  ar: 'arabic',

  // Russian
  ru: 'russian',

  // Hindi
  hi: 'hindi',

  // Malay-Indonesian
  bahasa: 'malay indonesian',
  'bahasa indonesia': 'malay indonesian',
  id: 'malay indonesian',
  melayu: 'malay indonesian',

  // Italian
  italiano: 'italian',
  it: 'italian',

  // Dutch
  nederlands: 'dutch',
  nl: 'dutch',

  // Turkish
  turkce: 'turkish',
  tr: 'turkish',

  // Vietnamese
  'tieng viet': 'vietnamese',
  vi: 'vietnamese',

  // Thai
  th: 'thai',

  // Bengali
  bangla: 'bengali',
  bn: 'bengali',

  // Ukrainian
  uk: 'ukrainian',

  // Persian
  farsi: 'persian',
  fa: 'persian',

  // Greek
  'modern greek': 'greek modern',
  'greek ancient': 'ancient greek',

  // URLs with accents
  sami: 'sámi',
  guarani: 'guaraní',
};
