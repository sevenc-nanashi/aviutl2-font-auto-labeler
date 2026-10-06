<script setup lang="ts">
import FileUpload from "./components/FileUpload.vue";
import FontResults from "./components/FontResults.vue";
import { useFontLabeler } from "./useFontLabeler";

const baseUrl = import.meta.env.BASE_URL;
const {
  current,
  entries,
  filename,
  status,
  error,
  loading,
  loadFile,
  download,
  setStatus,
} = useFontLabeler();
</script>

<template>
  <div class="container py-4">
    <header
      class="d-flex flex-wrap align-items-baseline justify-content-between gap-2 mb-4"
    >
      <h1 class="h4 mb-0">
        AviUtl2 <span class="fw-normal">Font Auto Labeler</span>
      </h1>
    </header>

    <main>
      <FileUpload @select="loadFile" @error="setStatus($event, true)" />

      <p
        id="status"
        class="small my-3"
        :class="error ? 'text-danger' : 'text-body-secondary'"
        role="status"
        aria-live="polite"
      >
        <span
          v-if="loading"
          class="spinner-border spinner-border-sm me-2"
          aria-hidden="true"
        ></span
        >{{ status }}
      </p>

      <FontResults
        v-if="current"
        v-model="entries"
        :filename="filename"
        @download="download"
      />

      <p class="small text-body-secondary mt-3 mb-0">
        AviUtl2を終了してから操作し、元のINIをバックアップして置き換えてください。
      </p>
    </main>

    <footer class="border-top mt-4 pt-3 small text-body-secondary">
      読み推定：<a
        href="https://github.com/takuyaa/kuromoji.js"
        target="_blank"
        rel="noreferrer"
        >kuromoji.js</a
      >
      · <a :href="`${baseUrl}vendor/NOTICE-kuromoji.md`">辞書ライセンス</a
      ><br />
      ソースコード：<a
        href="https://github.com/sevenc-nanashi/aviutl2-font-auto-labeler"
        target="_blank"
        rel="noreferrer"
        >sevenc-nanashi/aviutl2-font-auto-labeler</a
      >
    </footer>
  </div>
</template>
