import { normalizeName } from "./ini.ts";

// kuromojiに追加する「単語: 読み」。dev / build時に解析辞書へ組み込む。
// 読みにはカタカナ・英数字を使う。
export const KNOWN_READINGS: Readonly<Record<string, string>> = {
  源ノ角ゴシック: "ゲンノカクゴシック",
  源ノ明朝: "ゲンノミンチョウ",
};

const words = Object.keys(KNOWN_READINGS).map(normalizeName);

export function needsReading(name: string): boolean {
  return (
    /\p{Script=Han}/u.test(name) || words.some((word) => name.includes(word))
  );
}
