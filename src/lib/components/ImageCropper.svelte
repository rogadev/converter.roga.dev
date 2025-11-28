<script lang="ts">
  import type { CropRect } from '$lib/types'

  type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se'

  interface Props {
    src: string
    imageWidth: number
    imageHeight: number
    initialWidth?: number
    initialHeight?: number
    fixedSize?: boolean
    aspectRatio?: number | null
    onConfirm: (rect: CropRect) => void
    onCancel: () => void
  }

  const MIN_CROP_SIZE = 16

  let {
    src,
    imageWidth,
    imageHeight,
    initialWidth,
    initialHeight,
    fixedSize = false,
    aspectRatio = null,
    onConfirm,
    onCancel,
  }: Props = $props()

  let canResizeCorners = $derived(!fixedSize || aspectRatio !== null)
  let hasAspectRatio = $derived(aspectRatio !== null && aspectRatio > 0)

  let containerWidth = $state(0)
  let containerHeight = $state(0)

  function observeResize(node: HTMLElement) {
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      containerWidth = width
      containerHeight = height
    })
    observer.observe(node)
    return { destroy: () => observer.disconnect() }
  }

  let scale = $derived.by(() => {
    if (!containerWidth || !containerHeight || !imageWidth || !imageHeight)
      return 1
    return Math.min(
      containerWidth / imageWidth,
      containerHeight / imageHeight,
      1
    )
  })

  let displayWidth = $derived(imageWidth * scale)
  let displayHeight = $derived(imageHeight * scale)

  // Compute initial crop dimensions synchronously
  function computeInitialCrop(): {
    x: number
    y: number
    w: number
    h: number
  } {
    let w: number, h: number

    if (fixedSize && initialWidth && initialHeight) {
      w = Math.min(initialWidth, imageWidth)
      h = Math.min(initialHeight, imageHeight)
    } else if (aspectRatio && aspectRatio > 0) {
      const maxW = imageWidth * 0.8
      const maxH = imageHeight * 0.8
      if (maxW / aspectRatio <= maxH) {
        w = Math.round(maxW)
        h = Math.round(maxW / aspectRatio)
      } else {
        h = Math.round(maxH)
        w = Math.round(maxH * aspectRatio)
      }
    } else {
      w = Math.round(imageWidth * 0.8)
      h = Math.round(imageHeight * 0.8)
    }

    return {
      x: Math.round((imageWidth - w) / 2),
      y: Math.round((imageHeight - h) / 2),
      w,
      h,
    }
  }

  const initial = computeInitialCrop()
  let cropX = $state(initial.x)
  let cropY = $state(initial.y)
  let cropW = $state(initial.w)
  let cropH = $state(initial.h)

  let dragging = $state<DragMode | null>(null)
  let dragStart = { x: 0, y: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 }
  let capturedElement: Element | null = null

  function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }

  function computeResizedCrop(dx: number, dy: number, mode: DragMode) {
    let newX = dragStart.cropX
    let newY = dragStart.cropY
    let newW = dragStart.cropW
    let newH = dragStart.cropH

    if (hasAspectRatio && aspectRatio) {
      const diagonalDelta = (dx + dy) / 2
      switch (mode) {
        case 'nw':
          newW = dragStart.cropW - diagonalDelta
          newH = newW / aspectRatio
          newX = dragStart.cropX + dragStart.cropW - newW
          newY = dragStart.cropY + dragStart.cropH - newH
          break
        case 'ne':
          newW = dragStart.cropW + dx
          newH = newW / aspectRatio
          newY = dragStart.cropY + dragStart.cropH - newH
          break
        case 'sw':
          newW = dragStart.cropW - dx
          newH = newW / aspectRatio
          newX = dragStart.cropX + dragStart.cropW - newW
          break
        case 'se':
          newW = dragStart.cropW + diagonalDelta
          newH = newW / aspectRatio
          break
      }
    } else {
      switch (mode) {
        case 'nw':
          newX = dragStart.cropX + dx
          newY = dragStart.cropY + dy
          newW = dragStart.cropW - dx
          newH = dragStart.cropH - dy
          break
        case 'ne':
          newY = dragStart.cropY + dy
          newW = dragStart.cropW + dx
          newH = dragStart.cropH - dy
          break
        case 'sw':
          newX = dragStart.cropX + dx
          newW = dragStart.cropW - dx
          newH = dragStart.cropH + dy
          break
        case 'se':
          newW = dragStart.cropW + dx
          newH = dragStart.cropH + dy
          break
      }
    }

    // Enforce minimum size
    if (newW < MIN_CROP_SIZE) {
      if (mode === 'nw' || mode === 'sw') {
        newX = dragStart.cropX + dragStart.cropW - MIN_CROP_SIZE
      }
      newW = MIN_CROP_SIZE
      if (hasAspectRatio && aspectRatio) newH = newW / aspectRatio
    }
    if (newH < MIN_CROP_SIZE) {
      if (mode === 'nw' || mode === 'ne') {
        newY = dragStart.cropY + dragStart.cropH - MIN_CROP_SIZE
      }
      newH = MIN_CROP_SIZE
      if (hasAspectRatio && aspectRatio) newW = newH * aspectRatio
    }

    // Constrain to image bounds
    if (newX < 0) {
      newW += newX
      newX = 0
      if (hasAspectRatio && aspectRatio) newH = newW / aspectRatio
    }
    if (newY < 0) {
      newH += newY
      newY = 0
      if (hasAspectRatio && aspectRatio) newW = newH * aspectRatio
    }
    if (newX + newW > imageWidth) {
      newW = imageWidth - newX
      if (hasAspectRatio && aspectRatio) newH = newW / aspectRatio
    }
    if (newY + newH > imageHeight) {
      newH = imageHeight - newY
      if (hasAspectRatio && aspectRatio) newW = newH * aspectRatio
    }

    return { newX, newY, newW, newH }
  }

  function handlePointerMove(e: PointerEvent) {
    if (!dragging) return

    const dx = (e.clientX - dragStart.x) / scale
    const dy = (e.clientY - dragStart.y) / scale

    if (dragging === 'move') {
      cropX = clamp(Math.round(dragStart.cropX + dx), 0, imageWidth - cropW)
      cropY = clamp(Math.round(dragStart.cropY + dy), 0, imageHeight - cropH)
      return
    }

    if (!canResizeCorners) return

    const { newX, newY, newW, newH } = computeResizedCrop(dx, dy, dragging)
    cropX = Math.round(newX)
    cropY = Math.round(newY)
    cropW = Math.round(Math.max(MIN_CROP_SIZE, newW))
    cropH = Math.round(Math.max(MIN_CROP_SIZE, newH))
  }

  function handlePointerUp(e: PointerEvent) {
    if (capturedElement) {
      capturedElement.releasePointerCapture(e.pointerId)
      capturedElement = null
    }
    dragging = null
  }

  function startDrag(e: PointerEvent, mode: DragMode) {
    e.preventDefault()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    capturedElement = e.currentTarget as Element
    dragging = mode
    dragStart = { x: e.clientX, y: e.clientY, cropX, cropY, cropW, cropH }
  }

  function confirm() {
    onConfirm({ x: cropX, y: cropY, width: cropW, height: cropH })
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onCancel()
    } else if (e.key === 'Enter') {
      confirm()
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  class="fixed inset-0 z-50 bg-black/80 flex flex-col"
  role="dialog"
  aria-modal="true"
  aria-label="Crop image"
>
  <!-- Header -->
  <div class="flex items-center justify-between p-4 text-white">
    <div class="text-sm">
      {#if fixedSize && !aspectRatio}
        Drag to position crop area ({cropW} × {cropH})
      {:else if aspectRatio}
        Drag corners to resize (locked ratio), drag center to move
      {:else}
        Drag corners to resize, drag center to move
      {/if}
    </div>
    <div class="text-sm text-neutral-400">
      Output: {cropW} × {cropH} px
    </div>
  </div>

  <!-- Image container -->
  <div
    class="flex-1 flex items-center justify-center p-4 overflow-hidden"
    use:observeResize
  >
    {#if containerWidth > 0}
      <div
        class="relative"
        style="width: {displayWidth}px; height: {displayHeight}px;"
      >
        <!-- Image -->
        <img
          {src}
          alt="Crop preview"
          class="w-full h-full object-contain select-none pointer-events-none"
          draggable="false"
        />

        <!-- Darkened overlay outside crop area -->
        <div class="absolute inset-0 pointer-events-none">
          <!-- Top -->
          <div
            class="absolute bg-black/60"
            style="top: 0; left: 0; right: 0; height: {cropY * scale}px;"
          ></div>
          <!-- Bottom -->
          <div
            class="absolute bg-black/60"
            style="bottom: 0; left: 0; right: 0; height: {(imageHeight -
              cropY -
              cropH) *
              scale}px;"
          ></div>
          <!-- Left -->
          <div
            class="absolute bg-black/60"
            style="top: {cropY * scale}px; left: 0; width: {cropX *
              scale}px; height: {cropH * scale}px;"
          ></div>
          <!-- Right -->
          <div
            class="absolute bg-black/60"
            style="top: {cropY * scale}px; right: 0; width: {(imageWidth -
              cropX -
              cropW) *
              scale}px; height: {cropH * scale}px;"
          ></div>
        </div>

        <!-- Crop box -->
        <div
          class="absolute border-2 border-white cursor-move"
          style="
            left: {cropX * scale}px;
            top: {cropY * scale}px;
            width: {cropW * scale}px;
            height: {cropH * scale}px;
          "
          onpointerdown={(e) => startDrag(e, 'move')}
          onpointermove={handlePointerMove}
          onpointerup={handlePointerUp}
          role="application"
          aria-label="Crop selection area"
        >
          <!-- Rule of thirds grid -->
          <div class="absolute inset-0 pointer-events-none">
            <div
              class="absolute left-1/3 top-0 bottom-0 w-px bg-white/40"
            ></div>
            <div
              class="absolute left-2/3 top-0 bottom-0 w-px bg-white/40"
            ></div>
            <div class="absolute top-1/3 left-0 right-0 h-px bg-white/40"></div>
            <div class="absolute top-2/3 left-0 right-0 h-px bg-white/40"></div>
          </div>

          {#if canResizeCorners}
            {#snippet cornerHandle(
              corner: DragMode,
              position: string,
              cursor: string,
              label: string
            )}
              <button
                type="button"
                class="absolute w-4 h-4 bg-white rounded-full shadow-md border-0 p-0 {position} {cursor}"
                onpointerdown={(e) => {
                  e.stopPropagation()
                  startDrag(e, corner)
                }}
                onpointermove={handlePointerMove}
                onpointerup={handlePointerUp}
                aria-label={label}
              ></button>
            {/snippet}
            {@render cornerHandle(
              'nw',
              '-left-2 -top-2',
              'cursor-nw-resize',
              'Resize from top-left'
            )}
            {@render cornerHandle(
              'ne',
              '-right-2 -top-2',
              'cursor-ne-resize',
              'Resize from top-right'
            )}
            {@render cornerHandle(
              'sw',
              '-left-2 -bottom-2',
              'cursor-sw-resize',
              'Resize from bottom-left'
            )}
            {@render cornerHandle(
              'se',
              '-right-2 -bottom-2',
              'cursor-se-resize',
              'Resize from bottom-right'
            )}
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- Footer -->
  <div class="flex items-center justify-center gap-4 p-4">
    <button
      onclick={onCancel}
      class="px-6 py-2 rounded-md border border-neutral-500 text-white hover:bg-neutral-700 transition-colors"
    >
      Cancel
    </button>
    <button
      onclick={confirm}
      class="px-6 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-700 transition-colors"
    >
      Crop it
    </button>
  </div>
</div>
