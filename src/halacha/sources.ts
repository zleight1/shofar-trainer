export interface SourceLink {
  label: string;
  href: string;
}

export interface SourceEntry {
  id: string;
  heRef: string;
  enRef: string;
  hebrew: string;
  english: string;
  links: SourceLink[];
  encoded: boolean;
}

export const SOURCES: SourceEntry[] = [
  {
    id: 'mishnah-rh-4-9',
    heRef: 'משנה ראש השנה ד:ט / בבלי ר״ה לג ע״ב–לד ע״א',
    enRef: 'Mishnah Rosh Hashana 4:9 / Bavli RH 33b–34a',
    hebrew:
      'סדר התקיעות שלש של שלש שלש. שיעור תקיעה כתרועה. שיעור תרועה כשלש יבבות. רבי יהודה אומר: שיעור תקיעה כשלש תרועות, שיעור תרועה כשלש יבבות.',
    english:
      'The order of blasts is three of three of three. The length of a tekiah equals a teruah. The length of a teruah equals three yevavot. Rabbi Yehuda: a tekiah equals three teruot; a teruah equals three yevavot.',
    links: [{ label: 'Sefaria', href: 'https://www.sefaria.org/Mishnah_Rosh_Hashanah.4.9' }],
    encoded: false,
  },
  {
    id: 'sa-590',
    heRef: 'שו״ע או״ח תק״צ',
    enRef: 'Shulchan Aruch OC 590',
    hebrew:
      'שיעור תרועה כשלש יבבות. שיעור תקיעה כתרועה. יש אומרים שצריך לתקוע תשר״ת תש״ת תר״ת כדי לצאת ידי כל הספקות. יש מי שמתיר שברים יתרים אם האורך הכולל כשר.',
    english:
      'The length of teruah is three yevavot. The length of tekiah equals teruah. Some require Tashrat, Tashat, and Tarat to cover the doubts. Some permit extra shevarim notes when total length is valid (SA 590:3 leniency — not encoded here).',
    links: [
      { label: 'Sefaria', href: 'https://www.sefaria.org/Shulchan_Arukh%2C_Orach_Chayim.590' },
    ],
    encoded: false,
  },
  {
    id: 'mb-590',
    heRef: 'משנה ברורה תק״צ:יב–טו',
    enRef: 'Mishnah Berurah 590:12–15',
    hebrew:
      'לכתחילה שיעור תקיעה של תשר״ת י״ח כוחות, ושל תש״ת ותר״ת ט׳ כוחות. כל תקיעה צריכה להיות לפחות כאורך האמצע של אותו סט. שבר לא יהא ארוך כתקיעה. תרועה לכתחילה תשעה כוחות.',
    english:
      'Lechatchila: Tashrat tekiah is 18 kochot; Tashat and Tarat tekiah are 9. Each tekiah must be at least as long as that set’s middle. A shever must not be as long as a tekiah. Teruah is 9 kochot lechatchila. (MB 590:14: the printed SA “12 terumatin” for Tashrat is a typo; it should be 18.)',
    links: [{ label: 'Sefaria', href: 'https://www.sefaria.org/Mishnah_Berurah.590.12' }],
    encoded: true,
  },
  {
    id: 'rambam-shofar-3',
    heRef: 'רמב״ם הלכות שופר ג',
    enRef: 'Rambam Hilchot Shofar 3',
    hebrew:
      'שיעור תקיעה כחצי תרועה. שיעור תרועה כשלש יבבות. (שיעור זה אינו ברירת המחדל במאמן זה.)',
    english:
      'Rambam: each tekiah is half the middle teruah. This half-length profile is study-only here; the trainer follows Mishnah Berurah lechatchila floors, not Rambam 3:4.',
    links: [
      {
        label: 'Sefaria',
        href: 'https://www.sefaria.org/Mishneh_Torah%2C_Shofar%2C_Sukkah_and_Lulav.3',
      },
      {
        label: 'Chabad',
        href: 'https://www.chabad.org/library/article_cdo/aid/947920/jewish/Shofar-Sukkah-vLulav-Chapter-Three.htm',
      },
    ],
    encoded: false,
  },
  {
    id: 'ahs-590',
    heRef: 'ערוך השולחן או״ח תק״צ',
    enRef: 'Aruch HaShulchan OC 590',
    hebrew:
      'ערוך השולחן דן בסדר התקיעות ובשיעורי הכוחות לפי מנהג אשכנז. הציטוט כאן ללימוד רקע, לא כבדיקת האפליקציה.',
    english:
      'Aruch HaShulchan discusses the blast order and koach measures in Ashkenazi practice. Included for study; scoring follows Mishnah Berurah.',
    links: [
      { label: 'Sefaria', href: 'https://www.sefaria.org/Arukh_HaShulchan%2C_Orach_Chaim.590' },
    ],
    encoded: false,
  },
  {
    id: 'peninei-4-11',
    heRef: 'פניני הלכה ד:יא–יג',
    enRef: 'Peninei Halakha 4:11–13',
    hebrew:
      'פניני הלכה מסכם את סדר שלושים הקולות ואת הצורך בתשר״ת תש״ת תר״ת כדי לצאת ידי הספק. ללימוד רקע.',
    english:
      'Peninei Halakha summarizes the thirty-blast practice loop (Tashrat ×3, Tashat ×3, Tarat ×3) to cover the safek. Study background.',
    links: [
      { label: 'Peninei Halakha', href: 'https://ph.yhb.org.il/en/04-04-11/' },
      { label: 'Sefaria', href: 'https://www.sefaria.org/Peninei_Halakhah%2C_Yamim_Nora' },
    ],
    encoded: false,
  },
];
