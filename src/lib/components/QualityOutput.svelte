<script lang="ts">
  interface Props {
    quality: number
    onQualityChange: (value: number) => void
    estimatedWidth: number
    estimatedHeight: number
    showDimensions?: boolean
  }

  let {
    quality,
    onQualityChange,
    estimatedWidth,
    estimatedHeight,
    showDimensions = true,
  }: Props = $props()

  function handleInput(e: Event) {
    const input = e.target as HTMLInputElement
    onQualityChange(Number(input.value))
  }
</script>

<div class="border-t border-neutral-200 dark:border-neutral-800 pt-4">
  <div class="text-sm font-medium mb-3">Quality & output</div>

  <div class="space-y-4">
    <div>
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-neutral-600 dark:text-neutral-400">
          Quality
        </span>
        <span class="text-sm font-medium tabular-nums">
          {Math.round(quality * 100)}%
        </span>
      </div>
      <input
        type="range"
        min="0.1"
        max="1"
        step="0.05"
        value={quality}
        oninput={handleInput}
        class="w-full accent-sky-600 dark:accent-sky-400"
      />
      <p class="text-xs text-neutral-500 mt-1">
        Starts at 100%. Lower for smaller file size.
      </p>
    </div>

    {#if showDimensions}
      <div class="p-3 rounded-md bg-neutral-100 dark:bg-neutral-800 text-sm">
        <div class="text-xs text-neutral-500 mb-1">Output dimensions</div>
        <div class="font-medium">
          {estimatedWidth} × {estimatedHeight} px
        </div>
      </div>
    {/if}
  </div>
</div>

