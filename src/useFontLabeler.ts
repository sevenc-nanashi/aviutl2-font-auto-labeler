import { onUnmounted, ref, shallowRef } from "vue";
import {
  createEntries,
  normalizeName,
  parseIni,
  writeIni,
  type FontEntry,
  type IniDocument,
} from "./ini";
import { needsReading } from "./known-readings";
import type { ReadingResult } from "./reading-worker";

export function useFontLabeler() {
  const current = shallowRef<IniDocument>();
  const entries = ref<FontEntry[]>([]);
  const filename = ref("");
  const status = ref("");
  const error = ref(false);
  const loading = ref(false);
  let worker: Worker | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let loadId = 0;

  function setStatus(message: string, failed = false) {
    status.value = message;
    error.value = failed;
  }

  function stopWorker() {
    worker?.terminate();
    worker = undefined;
    clearTimeout(timeout);
  }

  async function loadFile(file: File) {
    const id = ++loadId;
    stopWorker();
    current.value = undefined;
    entries.value = [];
    loading.value = true;
    setStatus(`${file.name}を読み込み中…`);
    const fail = (message: string) => {
      if (id !== loadId) return;
      stopWorker();
      loading.value = false;
      setStatus(message, true);
    };
    try {
      if (file.size > 20 * 1024 * 1024)
        throw new Error("20MB以下のINIファイルを選択してください。");
      const buffer = await file.arrayBuffer();
      if (id !== loadId) return;
      let source: string;
      try {
        source = new TextDecoder("utf-8", {
          fatal: true,
          ignoreBOM: true,
        }).decode(buffer);
      } catch {
        throw new Error("UTF-8のaviutl2.iniを選択してください。");
      }
      const ini = parseIni(source);
      const names = ini.fonts.map((font) => normalizeName(font.name));
      const finish = (readings: string[]) => {
        if (id !== loadId) return;
        stopWorker();
        current.value = ini;
        entries.value = createEntries(ini, readings);
        filename.value = file.name;
        loading.value = false;
        setStatus(`${entries.value.length.toLocaleString()}件を分類しました。`);
      };
      if (!names.some(needsReading)) {
        finish(names);
        return;
      }
      setStatus("読み辞書を読み込み中…（約17MB）");
      worker = new Worker(new URL("./reading-worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onmessage = ({ data }: MessageEvent<ReadingResult>) => {
        if ("error" in data) fail(data.error);
        else finish(data.readings);
      };
      worker.onerror = () =>
        fail("読み推定を開始できませんでした。ファイルを選び直してください。");
      timeout = setTimeout(
        () =>
          fail(
            "辞書の読み込みがタイムアウトしました。通信状態を確認してください。",
          ),
        90_000,
      );
      worker.postMessage({
        names,
        dictionaryPath: new URL(
          `${import.meta.env.BASE_URL}vendor/dict/`,
          document.baseURI,
        ).pathname,
      });
    } catch (cause) {
      if (!(cause instanceof Error)) throw cause;
      fail(cause.message);
    }
  }

  function download() {
    if (!current.value) throw new Error("INIファイルが読み込まれていません。");
    try {
      const output = writeIni(current.value, entries.value);
      const url = URL.createObjectURL(
        new Blob([output], { type: "application/octet-stream" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "aviutl2.ini";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("ダウンロードしました。");
    } catch (cause) {
      if (!(cause instanceof Error)) throw cause;
      setStatus(cause.message, true);
    }
  }

  onUnmounted(() => {
    loadId++;
    stopWorker();
  });
  return {
    current,
    entries,
    filename,
    status,
    error,
    loading,
    loadFile,
    download,
    setStatus,
  };
}
