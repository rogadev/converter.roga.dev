<script lang="ts">
  import type { CropRect } from '$lib/types'

  const MAX_PREVIEW_SIZE = 400

  interface Props {
    src: string | null
    outputUrl: string | null
    outputSize: string | null
    cropRect: CropRect | null
    originalWidth: number
    originalHeight: number
    estimatedWidth: number
    estimatedHeight: number
  }

  let {
    src,
    outputUrl,
    outputSize,
    cropRect,
    originalWidth,
    originalHeight,
    estimatedWidth,
    estimatedHeight,
  }: Props = $props()

  let canvasEl = $state<HTMLCanvasElement | null>(null)

  // Canvas drawing requires $effect for DOM side-effects
  $effect(() => {
    const canvas = canvasEl
    const currentSrc = src
    if (!canvas || !currentSrc) return

    // Capture current values to avoid stale closure if effect re-runs
    const crop = cropRect
    const origW = originalWidth
    const origH = originalHeight
    const estW = estimatedWidth
    const estH = estimatedHeight

    let cancelled = false
    const img = new Image()

    img.onload = () => {
      if (cancelled) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const sx = crop?.x ?? 0
      const sy = crop?.y ?? 0
      const sw = crop?.width ?? origW
      const sh = crop?.height ?? origH

      const outputW = crop ? crop.width : estW
      const outputH = crop ? crop.height : estH

      const scale = Math.min(
        1,
        MAX_PREVIEW_SIZE / Math.max(outputW, outputH, 1)
      )
      const previewWidth = Math.round(outputW * scale) || 1
      const previewHeight = Math.round(outputH * scale) || 1

      canvas.width = previewWidth
      canvas.height = previewHeight
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, previewWidth, previewHeight)
    }

    img.src = currentSrc

    return () => {
      cancelled = true
    }
  })
</script>

<div class="mt-6">
  <div class="text-sm font-medium mb-2 text-neutral-600 dark:text-neutral-400">
    {#if outputUrl}
      Output
    {:else if src}
      Preview
    {:else}
      Output preview
    {/if}
  </div>
  <div
    class="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 p-4 flex justify-center"
  >
    {#if outputUrl}
      <img
        src={outputUrl}
        alt="Converted output"
        class="max-w-full max-h-96 rounded"
        style="width: auto; height: auto;"
      />
    {:else if src}
      <canvas bind:this={canvasEl} class="max-w-full max-h-96 rounded"></canvas>
    {:else}
      <span class="text-neutral-500 text-sm py-12">No image selected</span>
    {/if}
  </div>
  <div class="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
    {#if outputUrl && outputSize}
      <span>Final size: {outputSize}</span>
    {:else if src}
      <span>
        {#if cropRect}
          Crop: {cropRect.width}×{cropRect.height}
        {:else}
          {estimatedWidth}×{estimatedHeight} px
        {/if}
      </span>
    {/if}
  </div>
</div>
