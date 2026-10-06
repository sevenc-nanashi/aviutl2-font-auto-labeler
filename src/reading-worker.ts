import kuromoji from "kuromoji/build/kuromoji.js";
import { needsReading } from "./known-readings";

export type ReadingResult = { readings: string[] } | { error: string };

self.onmessage = ({
  data,
}: MessageEvent<{ names: string[]; dictionaryPath: string }>) => {
  kuromoji
    .builder({ dicPath: data.dictionaryPath })
    .build((error, tokenizer) => {
      if (error) {
        self.postMessage({
          error:
            "読み辞書を読み込めませんでした。通信状態を確認し、ファイルを選び直してください。",
        } satisfies ReadingResult);
        return;
      }
      try {
        const readings = data.names.map((name) => {
          if (!needsReading(name)) return name;
          // ponytail: unregistered proper names may be misread; add them to known-readings.ts.
          return tokenizer
            .tokenize(name)
            .map((token) =>
              token.word_type === "UNKNOWN"
                ? token.surface_form
                : token.reading,
            )
            .join("");
        });
        self.postMessage({ readings } satisfies ReadingResult);
      } catch {
        self.postMessage({
          error: "読みを推定できませんでした。ファイルを選び直してください。",
        } satisfies ReadingResult);
      }
    });
};
