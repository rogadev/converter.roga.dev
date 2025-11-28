<script lang="ts">
  interface Props {
    originalWidth: number
    originalHeight: number
    targetWidth: number | ''
    targetHeight: number | ''
    onWidthChange: (value: number | '') => void
    onHeightChange: (value: number | '') => void
  }

  let {
    originalWidth,
    originalHeight,
    targetWidth,
    targetHeight,
    onWidthChange,
    onHeightChange,
  }: Props = $props()

  function handleWidthInput(e: Event) {
    const input = e.target as HTMLInputElement
    const value = input.value === '' ? '' : Number(input.value)
    onWidthChange(value)
  }

  function handleHeightInput(e: Event) {
    const input = e.target as HTMLInputElement
    const value = input.value === '' ? '' : Number(input.value)
    onHeightChange(value)
  }
</script>

<div class="border-t border-neutral-200 dark:border-neutral-800 pt-4">
  <div class="text-sm font-medium mb-3">Resize dimensions</div>
  {#if originalWidth > 0}
    <div class="text-xs text-neutral-500 mb-3">
      Original: {originalWidth} × {originalHeight} px
    </div>
  {/if}
  <div class="grid grid-cols-2 gap-3">
    <label class="block">
      <span class="text-sm text-neutral-600 dark:text-neutral-400">
        Max width (px)
      </span>
      <input
        type="number"
        min="1"
        max={originalWidth || undefined}
        placeholder="auto"
        value={targetWidth}
        oninput={handleWidthInput}
        class="mt-1 w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
      />
    </label>
    <label class="block">
      <span class="text-sm text-neutral-600 dark:text-neutral-400">
        Max height (px)
      </span>
      <input
        type="number"
        min="1"
        max={originalHeight || undefined}
        placeholder="auto"
        value={targetHeight}
        oninput={handleHeightInput}
        class="mt-1 w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
      />
    </label>
  </div>
  <p class="text-xs text-neutral-500 mt-2">
    Set one dimension to scale proportionally, or both to enable crop positioning.
  </p>
</div>

