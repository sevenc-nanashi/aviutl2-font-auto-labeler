import { cp, mkdir, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import kuromoji from "kuromoji";
import { KNOWN_READINGS } from "../src/known-readings.ts";
import { normalizeName } from "../src/ini.ts";

await mkdir("public/vendor", { recursive: true });
await cp("node_modules/kuromoji/dict", "public/vendor/dict", {
  recursive: true,
});

// kuromoji.js 0.1.2 has no user-dictionary API. Compile added words into its lexicon.
const tokenizer = await new Promise((resolve, reject) => {
  kuromoji
    .builder({ dicPath: "node_modules/kuromoji/dict" })
    .build((error, value) => (error ? reject(error) : resolve(value)));
});
const dictionary = tokenizer.token_info_dictionary;
const builder = kuromoji.dictionaryBuilder();
for (const tokenIds of Object.values(dictionary.target_map)) {
  for (const id of tokenIds) {
    const [surface, ...features] = dictionary.getFeatures(id).split(",");
    builder.addTokenInfoDictionary(
      [
        surface,
        dictionary.dictionary.getShort(id),
        dictionary.dictionary.getShort(id + 2),
        dictionary.dictionary.getShort(id + 4),
        ...features,
      ].join(","),
    );
  }
}

// Reuse IPADIC's general-noun context; a low word cost favors registered readings.
const nounId = tokenizer.tokenize("フォント")[0].word_id;
for (const [name, reading] of Object.entries(KNOWN_READINGS)) {
  const surface = normalizeName(name);
  const kana = normalizeName(reading);
  builder.addTokenInfoDictionary(
    [
      surface,
      dictionary.dictionary.getShort(nounId),
      dictionary.dictionary.getShort(nounId + 2),
      -10000,
      "名詞",
      "一般",
      "*",
      "*",
      "*",
      "*",
      surface,
      kana,
      kana,
    ].join(","),
  );
}

const compiled = builder.buildTokenInfoDictionary();
for (const [name, data] of Object.entries({
  base: compiled.trie.bc.getBaseBuffer(),
  check: compiled.trie.bc.getCheckBuffer(),
  tid: compiled.token_info_dictionary.dictionary.buffer,
  tid_pos: compiled.token_info_dictionary.pos_buffer.buffer,
  tid_map: compiled.token_info_dictionary.targetMapToBuffer(),
})) {
  await writeFile(
    `public/vendor/dict/${name}.dat.gz`,
    gzipSync(Buffer.from(data.buffer, data.byteOffset, data.byteLength)),
  );
}

await cp(
  "node_modules/kuromoji/LICENSE-2.0.txt",
  "public/vendor/LICENSE-kuromoji.txt",
);
await cp("node_modules/kuromoji/NOTICE.md", "public/vendor/NOTICE-kuromoji.md");
