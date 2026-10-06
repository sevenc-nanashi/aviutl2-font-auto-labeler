<script setup lang="ts">
import { computed, ref, useTemplateRef } from "vue";
import { LABELS, normalizeName, type FontEntry } from "../ini";

const entries = defineModel<FontEntry[]>({ required: true });
defineProps<{ filename: string }>();
const emit = defineEmits<{ download: [] }>();
const search = ref("");
const filter = ref("");
const filterInput = useTemplateRef<HTMLSelectElement>("filterInput");

const visible = computed(() => {
  const query = search.value.normalize("NFKC").toLowerCase();
  return entries.value.filter(
    (entry) =>
      (!filter.value || entry.label === filter.value) &&
      `${entry.name} ${entry.reading}`
        .normalize("NFKC")
        .toLowerCase()
        .includes(query),
  );
});
const changes = computed(
  () =>
    entries.value.filter(
      (entry) =>
        entry.original !== entry.label || entry.originalOrder !== entry.order,
    ).length,
);
const labels = computed(() => [
  ...new Set([
    ...entries.value
      .filter((entry) => entry.custom)
      .map((entry) => entry.original),
    ...LABELS,
  ]),
]);
const groups = computed(() =>
  labels.value
    .map((label) => ({
      label,
      count: entries.value.filter((entry) => entry.label === label).length,
    }))
    .filter((group) => group.count > 0),
);
</script>

<template>
  <section id="results" aria-labelledby="results-title">
    <div
      class="d-flex flex-wrap align-items-baseline justify-content-between gap-2 mb-3"
    >
      <h2 id="results-title" class="h5 mb-0">ラベル・順序</h2>
      <span class="small text-body-secondary text-break">{{ filename }}</span>
    </div>
    <div class="row g-3 align-items-end mb-3">
      <div class="col-12 col-sm-6">
        <label for="search" class="form-label small">フォントを検索</label>
        <input
          id="search"
          v-model="search"
          class="form-control"
          type="search"
          placeholder="フォント名・読み"
        />
      </div>
      <div class="col-7 col-sm-3">
        <label for="filter" class="form-label small">ラベルで絞り込み</label>
        <select
          id="filter"
          ref="filterInput"
          v-model="filter"
          class="form-select"
        >
          <option value="">すべて</option>
          <option v-for="label in labels" :key="label" :value="label">
            {{ label }}
          </option>
        </select>
      </div>
      <div
        id="count"
        class="col-5 col-sm-3 text-end small text-body-secondary pb-2"
        aria-live="polite"
      >
        {{ visible.length.toLocaleString() }} /
        {{ entries.length.toLocaleString() }} 件
      </div>
    </div>
    <div class="d-flex flex-wrap gap-2 mb-3" aria-label="分類ごとのフォント数">
      <span
        v-for="group in groups"
        :key="group.label"
        class="badge text-body-secondary bg-body-secondary fw-normal"
        >{{ group.label }} {{ group.count }}</span
      >
    </div>
    <div
      class="table-responsive border rounded results-table"
      tabindex="0"
      aria-label="フォントの分類結果"
    >
      <table class="table table-hover align-middle mb-0">
        <thead class="table-light sticky-top text-nowrap">
          <tr>
            <th scope="col">順序</th>
            <th scope="col">フォント名 / 読み</th>
            <th scope="col">現在</th>
            <th scope="col">新しいラベル</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in visible" :key="entry.start">
            <td class="text-body-secondary">{{ entry.order + 1 }}</td>
            <td>
              <span class="fw-medium">{{ entry.name }}</span>
              <small
                v-if="entry.reading !== normalizeName(entry.name)"
                class="d-block text-body-secondary"
                >読み：{{ entry.reading }}</small
              >
            </td>
            <td class="text-body-secondary text-nowrap">
              {{ entry.original.trim() ? entry.original : "未設定" }}
            </td>
            <td>
              <select
                v-model="entry.label"
                class="form-select form-select-sm"
                :aria-label="`${entry.name}のラベル`"
                @change="filter && filterInput?.focus()"
              >
                <option v-if="entry.custom" :value="entry.original">
                  {{ entry.original }}
                </option>
                <option v-for="label in LABELS" :key="label" :value="label">
                  {{ label }}
                </option>
              </select>
            </td>
          </tr>
          <tr v-if="!visible.length">
            <td colspan="4" class="text-center text-body-secondary py-4">
              一致するフォントがありません。
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div
      class="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 py-3"
    >
      <span id="changes" class="small text-body-secondary"
        >{{ changes.toLocaleString() }}件を変更 · ラベルは編集できます</span
      >
      <button
        id="download"
        class="btn btn-primary"
        type="button"
        @click="emit('download')"
      >
        aviutl2.iniをダウンロード
      </button>
    </div>
  </section>
</template>
