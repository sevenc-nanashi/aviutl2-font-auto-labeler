import * as v from "valibot";

interface IniValue {
  original: string;
  start: number;
  end: number;
  prefix: string;
  suffix: string;
}

export interface Font extends IniValue {
  name: string;
  custom: boolean;
  originalOrder: number | undefined;
  orderField: IniValue;
}

export interface FontEntry extends Font {
  reading: string;
  label: string;
  order: number;
}

const OrderSchema = v.pipe(
  v.string(),
  v.trim(),
  v.regex(/^-?\d+$/),
  v.transform(Number),
  v.safeInteger(),
);

export type IniDocument = ReturnType<typeof parseIni>;

export const LABELS = [
  "0-9",
  "A-F",
  "G-N",
  "O-T",
  "U-Z",
  "あ行",
  "か行",
  "さ行",
  "た行",
  "な行",
  "は行",
  "ま行",
  "や行",
  "ら行",
  "わ行",
  "その他",
];

export function normalizeName(name: string) {
  return name.normalize("NFKC").trim().replace(/^@\s*/, "");
}

export function classify(reading: string): string {
  const first = normalizeName(reading).toUpperCase().normalize("NFD")[0];
  if (!first) return "その他";
  for (const [pattern, label] of [
    [/[0-9]/, "0-9"],
    [/[A-F]/, "A-F"],
    [/[G-N]/, "G-N"],
    [/[O-T]/, "O-T"],
    [/[U-Z]/, "U-Z"],
    [/[ぁ-おァ-オ]/, "あ行"],
    [/[か-こカ-コゕゖヵヶ]/, "か行"],
    [/[さ-そサ-ソ]/, "さ行"],
    [/[た-とタ-ト]/, "た行"],
    [/[な-のナ-ノ]/, "な行"],
    [/[は-ほハ-ホ]/, "は行"],
    [/[ま-もマ-モ]/, "ま行"],
    [/[ゃ-よャ-ヨ]/, "や行"],
    [/[ら-ろラ-ロ]/, "ら行"],
    [/[ゎ-んヮ-ン]/, "わ行"],
  ] as const) {
    if (pattern.test(first)) return label;
  }
  return "その他";
}

// Replacing value ranges keeps unrelated settings, comments, BOM and newlines intact.
export function parseIni(source: string) {
  if (source.includes("\0"))
    throw new Error("UTF-8のINIファイルを選択してください。");
  const sections = [
    ...source.matchAll(/^[\t \uFEFF]*\[([^\r\n]+)\][\t ]*(?:\r\n|\n|\r|$)/gm),
  ];
  const fonts: Font[] = [];
  for (let index = 0; index < sections.length; index++) {
    const section = sections[index];
    if (!section[1].startsWith("Font.")) continue;
    const name = section[1].slice(5);
    if (!name.trim())
      throw new Error("フォント名が空のFontセクションがあります。");
    const bodyStart = section.index + section[0].length;
    const bodyEnd =
      index + 1 < sections.length ? sections[index + 1].index : source.length;
    const body = source.slice(bodyStart, bodyEnd);
    const readField = (key: "label" | "order"): IniValue => {
      const matches = [
        ...body.matchAll(
          new RegExp(`^([\\t ]*${key}[\\t ]*=[\\t ]*)([^\\r\\n]*)`, "gm"),
        ),
      ];
      if (matches.length > 1)
        throw new Error(
          `${name} に${key}が複数あります。INIを確認してください。`,
        );
      if (matches.length) {
        const match = matches[0];
        const start = bodyStart + match.index + match[1].length;
        return {
          original: match[2],
          start,
          end: start + match[2].length,
          prefix: "",
          suffix: "",
        };
      }
      const newline = source.match(/\r\n|\n|\r/);
      const eol = newline ? newline[0] : "\r\n";
      const headerHasNewline = /[\r\n]$/.test(section[0]);
      return {
        original: "",
        start: bodyStart,
        end: bodyStart,
        prefix: `${headerHasNewline ? "" : eol}${key}=`,
        suffix: headerHasNewline ? eol : "",
      };
    };
    const label = readField("label");
    const orderField = readField("order");
    let originalOrder: number | undefined;
    if (!orderField.prefix) {
      const result = v.safeParse(OrderSchema, orderField.original);
      if (!result.success)
        throw new Error(
          `${name} のorderが整数ではありません。INIを確認してください。`,
        );
      originalOrder = result.output;
    }
    fonts.push({
      ...label,
      name,
      custom:
        label.original.trim() !== "" && !LABELS.includes(label.original.trim()),
      originalOrder,
      orderField,
    });
  }
  if (!fonts.length)
    throw new Error(
      "[Font.フォント名] セクションが見つかりません。aviutl2.iniを選択してください。",
    );
  return { source, fonts };
}

export function createEntries(
  document: IniDocument,
  readings: string[],
): FontEntry[] {
  if (readings.length !== document.fonts.length)
    throw new Error(
      "読みの件数が一致しません。ファイルを読み込み直してください。",
    );
  const collator = new Intl.Collator("ja");
  return document.fonts
    .map((font, index) => ({
      ...font,
      reading: readings[index],
      label: font.custom ? font.original : classify(readings[index]),
    }))
    .sort((a, b) => {
      if (a.custom !== b.custom) return a.custom ? -1 : 1;
      if (!a.custom) return collator.compare(a.reading, b.reading);
      if (a.originalOrder === undefined)
        return b.originalOrder === undefined ? 0 : 1;
      if (b.originalOrder === undefined) return -1;
      return a.originalOrder - b.originalOrder;
    })
    .map((entry, order) => ({ ...entry, order }));
}

export function writeIni(document: IniDocument, entries: FontEntry[]) {
  const byStart = new Map(entries.map((entry) => [entry.start, entry]));
  if (
    entries.length !== document.fonts.length ||
    byStart.size !== document.fonts.length
  )
    throw new Error("分類結果が不正です。ファイルを読み込み直してください。");
  const edits = document.fonts.flatMap((font) => {
    const entry = byStart.get(font.start);
    if (
      !entry ||
      !(LABELS.includes(entry.label) || entry.label === font.original)
    )
      throw new Error("分類結果が不正です。ファイルを読み込み直してください。");
    return [
      { ...font, value: entry.label },
      { ...font.orderField, value: String(entry.order) },
    ];
  });
  let output = document.source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output =
      output.slice(0, edit.start) +
      edit.prefix +
      edit.value +
      edit.suffix +
      output.slice(edit.end);
  }
  return output;
}
