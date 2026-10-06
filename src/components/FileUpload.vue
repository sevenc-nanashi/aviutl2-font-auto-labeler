<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

const emit = defineEmits<{ select: [file: File]; error: [message: string] }>();
const dragging = ref(false);

function selectFile(event: Event) {
  const input = event.currentTarget as HTMLInputElement;
  if (input.files?.length) emit("select", input.files[0]);
}

function dropFile(event: DragEvent) {
  dragging.value = false;
  if (event.dataTransfer?.files.length !== 1) {
    emit("error", "INIファイルを1つ選択してください。");
    return;
  }
  emit("select", event.dataTransfer.files[0]);
}

function preventDrop(event: DragEvent) {
  event.preventDefault();
}
onMounted(() => {
  window.addEventListener("dragover", preventDrop);
  window.addEventListener("drop", preventDrop);
});
onUnmounted(() => {
  window.removeEventListener("dragover", preventDrop);
  window.removeEventListener("drop", preventDrop);
});
</script>

<template>
  <section aria-labelledby="upload-title">
    <div class="d-flex align-items-center justify-content-between gap-3 mb-2">
      <h2 id="upload-title" class="h6 mb-0">INIファイル</h2>
    </div>
    <div
      id="dropzone"
      class="border rounded p-3"
      :class="{ 'border-primary bg-primary-subtle': dragging }"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="dropFile"
    >
      <label for="file" class="form-label"
        >aviutl2.iniを選択、またはドロップ</label
      >
      <input
        id="file"
        class="form-control"
        type="file"
        accept=".ini"
        aria-describedby="file-help"
        @change="selectFile"
      />
      <div id="file-help" class="form-text">
        <code class="text-break">C:\ProgramData\aviutl2\aviutl2.ini</code> ·
        UTF-8 / 20MB以下
      </div>
    </div>
  </section>
</template>
