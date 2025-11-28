<script lang="ts">
  import type { CropRect } from '$lib/types'

  interface Props {
    cropRect: CropRect | null
    aspectRatio: number | null
    aspectRatioLabel?: string
    bothDimensionsSet: boolean
    targetWidth: number | ''
    targetHeight: number | ''
    onEnterCropMode: () => void
    onClearCrop: () => void
  }

  let {
    cropRect,
    aspectRatio,
    aspectRatioLabel,
    bothDimensionsSet,
    targetWidth,
    targetHeight,
    onEnterCropMode,
    onClearCrop,
  }: Props = $props()
</script>

<div class="border-t border-neutral-200 dark:border-neutral-800 pt-4">
  <div class="flex items-center justify-between mb-3">
    <div class="text-sm font-medium">Crop image</div>
  </div>

  {#if bothDimensionsSet && !cropRect}
    <button
      type="button"
      onclick={onEnterCropMode}
      class="w-full px-4 py-2.5 rounded-md bg-amber-500 text-white hover:bg-amber-600 transition-colors text-sm font-medium"
    >
      Position crop area ({targetWidth} × {targetHeight})
    </button>
  {:else}
    <button
      type="button"
      onclick={onEnterCropMode}
      class="w-full px-4 py-2.5 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-sm flex items-center justify-center gap-2"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M6 2v14a2 2 0 0 0 2 2h14" />
        <path d="M18 22V8a2 2 0 0 0-2-2H2" />
      </svg>
      {#if aspectRatio}
        Enter crop mode (locked to {aspectRatioLabel})
      {:else}
        Enter free crop mode
      {/if}
    </button>
  {/if}

  {#if cropRect}
    <div
      class="mt-3 flex items-center justify-between text-sm p-3 rounded-md bg-neutral-100 dark:bg-neutral-800"
    >
      <span class="text-neutral-600 dark:text-neutral-400">
        <span class="font-medium text-neutral-900 dark:text-neutral-100">
          Crop set:
        </span>
        {cropRect.width}×{cropRect.height} at ({cropRect.x}, {cropRect.y})
      </span>
      <button
        type="button"
        onclick={onClearCrop}
        class="text-red-600 hover:text-red-700 dark:text-red-400 text-xs font-medium"
      >
        Clear
      </button>
    </div>
  {/if}
</div>
