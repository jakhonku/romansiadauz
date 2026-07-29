/**
 * The recommended competition repertoire, transcribed from `романсиада_ноты.docx`.
 *
 * Titles and credits are the document's own — including its spellings, which vary
 * between entries. They are not translated: a work's title and the names of its
 * composer and poet read the same in every language of the site, and rendering
 * «ЖОНОН КЎРИНУР» three different ways would invent three different works.
 *
 * Static data rather than a table. The list is an annex to the Regulations, arrives
 * once per season as a document, and is read by every visitor and written by nobody —
 * a CMS module for it would be a screen that is opened once and then never again.
 *
 * A work appears under every voice it is listed for; `file` is the object key in the
 * `scores` bucket, shared by those entries. `ПАРИ РЎЙИМ` is the exception with two
 * files, because the mezzo-soprano transcription was supplied separately.
 */

export type VoiceKey = 'bass' | 'baritone' | 'tenor' | 'mezzo' | 'soprano';

export interface Score {
  /** Title as printed in the repertoire list. */
  title: string;
  /** Composer and poet, as printed. */
  credit: string;
  /**
   * Object key in the `scores` bucket, or `null` when no score was supplied for the
   * work. `БАҲОР` is listed in the document but arrived without a PDF; it stays in the
   * list because dropping it would silently shorten the approved repertoire.
   */
  file: string | null;
  /** Original file name, used for the download so the saved file is recognisable. */
  fileName: string | null;
}

export interface VoiceGroup {
  voice: VoiceKey;
  scores: Score[];
}

const jononKorinur: Score = {
  title: 'ЖОНОН КЎРИНУР',
  credit: 'Т. Содиков мусикаси, Низомий сўзи',
  file: 'jonon-korinur.pdf',
  fileName: 'жонон куринур.pdf',
};

const qalb: Score = {
  title: 'КАЛБ',
  credit: 'С. Бобоев мусикаси, С. Зуннунова сўзи',
  file: 'qalb.pdf',
  fileName: 'калб.pdf',
};

const meniEslagin: Score = {
  title: 'МЕНИ ЭСЛАГИН',
  credit: 'Б. Умеджонов мусикаси, Х. Салох сўзи',
  file: 'meni-eslagin.pdf',
  fileName: 'Мени эслагин.pdf',
};

const yulduz: Score = {
  title: 'ЮЛДУЗ',
  credit: 'Р. Абдуллаев мусикаси, А. Орипов сўзи',
  file: 'yulduz.pdf',
  fileName: 'Юлдуз.pdf',
};

const sevgi: Score = {
  title: 'СЕВГИ',
  credit: 'Б. Умеджонўв мусиқаси, Ойбек сўзи',
  file: 'sevgi.pdf',
  fileName: 'Севги.pdf',
};

const uzoqda: Score = {
  title: 'УЗОҚДА',
  credit: 'Ҳ. Раҳимов мусиқаси, П. Бобожон сўзи',
  file: 'uzoqda.pdf',
  fileName: 'Узокда.pdf',
};

const pariRoyim: Score = {
  title: 'ПАРИ РЎЙИМ',
  credit: 'С. Жалил мусикаси, Фуркат сўзи',
  file: 'pari-royim.pdf',
  fileName: 'Пари руйим.pdf',
};

const pariRoyimMezzo: Score = {
  ...pariRoyim,
  file: 'pari-royim-mezzo.pdf',
  fileName: 'Пари_руйим_меццо.pdf',
};

const kormadim: Score = {
  title: 'КЎРМАДИМ',
  credit: 'Д. Зокиров мусикаси, А. Навоий сўзи',
  file: 'kormadim.pdf',
  fileName: 'курмадим.pdf',
};

const yorKetdi: Score = {
  title: 'ЙОР КЕТДИ',
  credit: 'С. Бобоев мусиқаси, Ойбек сўзи',
  file: 'yor-ketdi.pdf',
  fileName: 'Ёр кетди.pdf',
};

const rozimasman: Score = {
  title: 'РОЗИМАСМАН',
  credit: 'К. Кенжаев мусиқаси, Ҳ. Олимжон сўзи',
  file: 'rozimasman.pdf',
  fileName: 'Розимасман.pdf',
};

const kuylamaSohibjamol: Score = {
  title: 'КУЙЛАМА, СОХИБЖАМОЛ…',
  credit: 'С. Юдаков мусикаси, А. С. Пушкин сўзи',
  file: 'kuylama-sohibjamol.pdf',
  fileName: 'Куйлама, сохибжамол.pdf',
};

const sarviGul: Score = {
  title: 'САРВИ ГУЛ',
  credit: 'Т. Содиқов мусиқаси, Алишер Навоий сўзи',
  file: 'sarvi-gul.pdf',
  fileName: 'Сарви гул.pdf',
};

const eyGul: Score = {
  title: 'ЭЙ, ГУЛ',
  credit: 'П. Раҳимов мусиқаси, Робия Балҳий сўзи',
  file: 'ey-gul.pdf',
  fileName: 'Эй гул.pdf',
};

const bahorQoshigi: Score = {
  title: 'БАХОР КЎШИГИ',
  credit: 'М. Бурхонов мусикаси, Т. Тула сўзи',
  file: 'bahor-qoshigi.pdf',
  fileName: 'БАХОР КУШИРИ.pdf',
};

const sevimliYorim: Score = {
  title: 'СЕВИМЛИ ЁРИМ',
  credit: 'Х. Рахимов мусикаси, Т. Тула сўзи',
  file: 'sevimli-yorim.pdf',
  fileName: 'Севимли ерим.pdf',
};

const muhabbat: Score = {
  title: 'МУХАББАТ',
  credit: 'Ш. Рамазонов мусикаси, Туроб Тула сўзи',
  file: 'muhabbat.pdf',
  fileName: 'Мухаббат.pdf',
};

const dugonalar: Score = {
  title: 'ДУГОНАЛАР',
  credit: 'С. Юдаков мусиқаси, Ш. Рашидов сўзи',
  file: 'dugonalar.pdf',
  fileName: 'Дугоналар.pdf',
};

const bahor: Score = {
  title: 'БАҲОР',
  credit: 'Т. Содиков мусикаси, Миртемир сўзи',
  file: null,
  fileName: null,
};

const kashmirda: Score = {
  title: 'КАШМИРДА',
  credit: 'М. Ашрафий мусикаси, Фуркат сўзи',
  file: 'kashmirda.pdf',
  fileName: 'Кашмирда.pdf',
};

const sendadurKozlarim: Score = {
  title: 'СЕНДАДЎР КЎЗЛАРИМ',
  credit: 'Б. Умеджонўв мусиқаси, Ойбек сўзи',
  file: 'sendadur-kozlarim.pdf',
  fileName: "Sendadur ko'zlarim.pdf",
};

const soginch: Score = {
  title: 'СОҒИНЧ',
  credit: 'Р. Абдуллаев мусиқаси, Омон Матчон сўзи',
  file: 'soginch.pdf',
  fileName: 'Согинч.pdf',
};

const bulbul: Score = {
  title: 'БУЛБУЛ',
  credit: 'Т. Содиқов мусиқаси, Халқ сўзи',
  file: 'bulbul.pdf',
  fileName: 'Бульбул.pdf',
};

const shodlikValsi: Score = {
  title: 'ШОДЛИК ВАЛСИ',
  credit: 'Р. Абдуллаев мусиқаси, Ж. Жабборов',
  file: 'shodlik-valsi.pdf',
  fileName: 'Шодлик вальси.pdf',
};

const yurakSadosi: Score = {
  title: 'ЮРАК САДОСИ',
  credit: 'М. Бурхонов мусиқаси, Т. Тўла сўзи',
  file: 'yurak-sadosi.pdf',
  fileName: 'Юрак Садоси.pdf',
};

export const scoreRepertoire: readonly VoiceGroup[] = [
  {
    voice: 'bass',
    scores: [jononKorinur, qalb, meniEslagin, yulduz, sevgi, uzoqda],
  },
  {
    voice: 'baritone',
    scores: [
      jononKorinur,
      qalb,
      pariRoyim,
      kormadim,
      meniEslagin,
      yulduz,
      sevgi,
      uzoqda,
      yorKetdi,
      rozimasman,
    ],
  },
  {
    voice: 'tenor',
    scores: [kuylamaSohibjamol, pariRoyim, sarviGul, eyGul],
  },
  {
    voice: 'mezzo',
    scores: [bahorQoshigi, sevimliYorim, muhabbat, pariRoyimMezzo, dugonalar],
  },
  {
    voice: 'soprano',
    scores: [
      sevimliYorim,
      bahor,
      kashmirda,
      sendadurKozlarim,
      soginch,
      bulbul,
      shodlikValsi,
      dugonalar,
      yurakSadosi,
    ],
  },
] as const;
