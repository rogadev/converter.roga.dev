<script lang="ts">
  import { downloadBlob, humanFileSize, renameFile } from '$lib/converters/web'
  import { ConversionService } from '$lib/conversion-service'
  import { detectFileKind, getDefaultImageTarget } from '$lib/file-utils'
  import { handleConversionError } from '$lib/error-handler'
  import type { FileKind, ImageFormat, CropRect } from '$lib/types'
  import ImageCropper from '$lib/components/ImageCropper.svelte'
  import ImagePreview from '$lib/components/ImagePreview.svelte'
  import FormatSelector from '$lib/components/FormatSelector.svelte'
  import ResizeOptions from '$lib/components/ResizeOptions.svelte'
  import AspectRatioSelector from '$lib/components/AspectRatioSelector.svelte'
  import CropSection from '$lib/components/CropSection.svelte'
  import QualityOutput from '$lib/components/QualityOutput.svelte'

  const DEFAULT_IMAGE_QUALITY = 1.0
  const DEFAULT_GIF_WIDTH = 480
  const DEFAULT_GIF_FPS = 12

  const ASPECT_RATIOS = [
    { value: 1, label: '1:1' },
    { value: 4 / 3, label: '4:3' },
    { value: 3 / 2, label: '3:2' },
    { value: 16 / 9, label: '16:9' },
    { value: 9 / 16, label: '9:16' },
    { value: 3 / 4, label: '3:4' },
    { value: 2 / 3, label: '2:3' },
  ] as const

  function getAspectRatioLabel(ratio: number | null): string | undefined {
    if (ratio === null) return undefined
    const match = ASPECT_RATIOS.find((r) => Math.abs(r.value - ratio) < 0.001)
    return match?.label
  }

  // Core state
  let selectedFile = $state<File | null>(null)
  let fileKind = $state<FileKind>(null)
  let errorMessage = $state<string | null>(null)
  let working = $state(false)
  let outputUrl = $state<string | null>(null)
  let outputSize = $state<string | null>(null)

  // Image conversion settings
  let imageTarget = $state<ImageFormat>('webp')
  let imageQuality = $state(DEFAULT_IMAGE_QUALITY)

  // Video conversion settings
  let gifWidth = $state<number | ''>(DEFAULT_GIF_WIDTH)
  let gifFps = $state<number | ''>(DEFAULT_GIF_FPS)
  let gifStart = $state<number | ''>('')
  let gifDuration = $state<number | ''>('')
  let gifHighQuality = $state(true)

  // Image resize/crop state
  let originalWidth = $state(0)
  let originalHeight = $state(0)
  let targetWidth = $state<number | ''>('')
  let targetHeight = $state<number | ''>('')
  let aspectRatio = $state<number | null>(null)
  let cropMode = $state(false)
  let cropRect = $state<CropRect | null>(null)
  let imagePreviewUrl = $state<string | null>(null)

  // Share feedback
  let shareMessage = $state<string | null>(null)
  let shareTimeoutId = $state<ReturnType<typeof setTimeout> | null>(null)

  // Derived state
  let bothDimensionsSet = $derived(
    targetWidth !== '' &&
      targetHeight !== '' &&
      Number(targetWidth) > 0 &&
      Number(targetHeight) > 0
  )

  let readyToConvert = $derived(
    !!selectedFile &&
      fileKind !== 'unsupported' &&
      !working &&
      !cropMode &&
      (!bothDimensionsSet || !!cropRect)
  )

  let estimatedWidth = $derived.by(() => {
    if (cropRect) return cropRect.width
    if (targetWidth !== '') return Number(targetWidth)
    if (targetHeight !== '' && originalWidth && originalHeight) {
      return Math.round(Number(targetHeight) * (originalWidth / originalHeight))
    }
    return originalWidth
  })

  let estimatedHeight = $derived.by(() => {
    if (cropRect) return cropRect.height
    if (targetHeight !== '') return Number(targetHeight)
    if (targetWidth !== '' && originalWidth && originalHeight) {
      return Math.round(Number(targetWidth) * (originalHeight / originalWidth))
    }
    return originalHeight
  })

  // Cleanup URLs when they change
  $effect(() => {
    const url = imagePreviewUrl
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  })

  $effect(() => {
    const url = outputUrl
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  })

  $effect(() => {
    const timeoutId = shareTimeoutId
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  })

  function handleFileInput(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) setFile(file)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer?.files?.[0]
    if (file) setFile(file)
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
  }

  function resetConversionState() {
    errorMessage = null
    outputUrl = null // Effect cleanup handles URL.revokeObjectURL
    outputSize = null
  }

  function resetImageSettings() {
    imageQuality = DEFAULT_IMAGE_QUALITY
    targetWidth = ''
    targetHeight = ''
    aspectRatio = null
    cropRect = null
    cropMode = false
  }

  function resetVideoSettings() {
    gifWidth = DEFAULT_GIF_WIDTH
    gifFps = DEFAULT_GIF_FPS
    gifStart = ''
    gifDuration = ''
    gifHighQuality = true
  }

  async function loadImageDimensions(
    file: File
  ): Promise<{ width: number; height: number }> {
    const url = URL.createObjectURL(file)
    try {
      return await new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () =>
          resolve({ width: img.naturalWidth, height: img.naturalHeight })
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = url
      })
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  async function setFile(file: File) {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
      imagePreviewUrl = null
    }

    selectedFile = file
    fileKind = detectFileKind(file)
    resetConversionState()

    if (fileKind === 'image') {
      imageTarget = getDefaultImageTarget(file)
      resetImageSettings()
      try {
        const dims = await loadImageDimensions(file)
        originalWidth = dims.width
        originalHeight = dims.height
        imagePreviewUrl = URL.createObjectURL(file)
      } catch {
        originalWidth = 0
        originalHeight = 0
      }
    } else if (fileKind === 'video') {
      resetVideoSettings()
      originalWidth = 0
      originalHeight = 0
    } else {
      originalWidth = 0
      originalHeight = 0
    }
  }

  async function startConversion(e: Event) {
    e.preventDefault()
    if (!selectedFile || !fileKind || fileKind === 'unsupported') return

    working = true
    resetConversionState()

    try {
      const result = await convertFile()
      if (!result) return

      outputUrl = URL.createObjectURL(result.blob)
      outputSize = humanFileSize(result.blob.size)
      downloadBlob(result.blob, result.filename)
    } catch (err) {
      errorMessage = handleConversionError(err, fileKind)
    } finally {
      working = false
    }
  }

  async function convertFile(): Promise<{
    blob: Blob
    filename: string
  } | null> {
    if (!selectedFile || !fileKind) return null

    if (fileKind === 'image') {
      return ConversionService.convertImage(selectedFile, {
        targetFormat: imageTarget,
        quality: imageQuality,
        maxWidth:
          targetWidth !== '' && targetHeight === ''
            ? Number(targetWidth)
            : undefined,
        maxHeight:
          targetHeight !== '' && targetWidth === ''
            ? Number(targetHeight)
            : undefined,
        cropRect: cropRect ?? undefined,
      })
    }

    if (fileKind === 'video') {
      return ConversionService.convertVideo(selectedFile, {
        width: gifWidth,
        fps: gifFps,
        start: gifStart,
        duration: gifDuration,
        highQuality: gifHighQuality,
      })
    }

    return null
  }

  function enterCropMode() {
    cropMode = true
  }

  function handleCropConfirm(rect: CropRect) {
    cropRect = rect
    cropMode = false
  }

  function handleCropCancel() {
    cropMode = false
  }

  function clearCrop() {
    cropRect = null
    targetWidth = ''
    targetHeight = ''
  }

  async function shareApp() {
    const shareData = {
      title: 'Image Converter',
      text: 'Check out this awesome file converter - runs entirely in your browser!',
      url: window.location.href,
    }

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData)
        shareMessage = 'Shared successfully!'
      } else {
        await navigator.clipboard.writeText(window.location.href)
        shareMessage = 'Link copied to clipboard!'
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(window.location.href)
          shareMessage = 'Link copied to clipboard!'
        } catch {
          shareMessage = 'Failed to share'
        }
      }
    }

    if (shareTimeoutId) clearTimeout(shareTimeoutId)
    shareTimeoutId = setTimeout(() => {
      shareMessage = null
      shareTimeoutId = null
    }, 2000)
  }

  async function downloadAgain(e: Event) {
    e.preventDefault()
    if (!outputUrl || !selectedFile) return

    try {
      const res = await fetch(outputUrl)
      const blob = await res.blob()
      const ext = fileKind === 'image' ? imageTarget : 'gif'
      downloadBlob(blob, renameFile(selectedFile.name, ext))
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Download failed'
    }
  }
</script>

<svelte:head>
  <title>Image File Converter</title>
  <meta
    name="description"
    content="Drop a file or click to upload. Pick an option, then start conversion."
  />
</svelte:head>

<section
  class="min-h-dvh bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
>
  <div class="mx-auto max-w-3xl px-6 py-12">
    <header class="mb-10 text-center relative">
      <button
        type="button"
        onclick={shareApp}
        class="absolute right-0 top-0 p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        aria-label="Share this converter with a friend"
        title="Share this converter with a friend"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      </button>
      {#if shareMessage}
        <div
          class="absolute right-0 top-12 text-xs bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 px-3 py-1.5 rounded-md shadow-lg"
        >
          {shareMessage}
        </div>
      {/if}
      <h1 class="text-3xl md:text-5xl font-semibold tracking-tight">
        Image Converter
      </h1>
      <p class="mt-2 text-neutral-600 dark:text-neutral-400">
        Drop a file or click to upload. Pick an option, then start conversion.
      </p>
    </header>

    <div
      class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 backdrop-blur shadow-sm p-6"
    >
      <!-- Upload area -->
      <div class="mb-6">
        <input
          id="file-input"
          type="file"
          aria-label="Choose files"
          class="hidden"
          onchange={handleFileInput}
        />
        <label
          for="file-input"
          class="block cursor-pointer rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-800/40 px-6 py-12 text-center hover:bg-neutral-100/60 dark:hover:bg-neutral-800"
          ondrop={handleDrop}
          ondragover={handleDragOver}
        >
          {#if selectedFile}
            <div class="text-sm">
              <div class="font-medium">{selectedFile.name}</div>
              <div class="text-neutral-600 dark:text-neutral-400">
                {humanFileSize(selectedFile.size)}
              </div>
              <div class="mt-2 text-xs">Click to change or drop a new file</div>
            </div>
          {:else}
            <div class="text-sm text-neutral-600 dark:text-neutral-400">
              <div class="font-medium">Drag & drop your file here</div>
              <div class="mt-1">or click to browse</div>
            </div>
          {/if}
        </label>
      </div>

      <!-- Image Options -->
      {#if fileKind === 'image'}
        <div class="grid gap-6">
          <FormatSelector
            selected={imageTarget}
            onchange={(format) => (imageTarget = format)}
          />

          <ResizeOptions
            {originalWidth}
            {originalHeight}
            {targetWidth}
            {targetHeight}
            onWidthChange={(v) => {
              targetWidth = v
              if (v === '' || targetHeight === '') cropRect = null
            }}
            onHeightChange={(v) => {
              targetHeight = v
              if (v === '' || targetWidth === '') cropRect = null
            }}
          />

          <AspectRatioSelector
            selected={aspectRatio}
            onchange={(ratio) => {
              aspectRatio = ratio
              if (!ratio) cropRect = null
            }}
          />

          <CropSection
            {cropRect}
            {aspectRatio}
            aspectRatioLabel={getAspectRatioLabel(aspectRatio)}
            {bothDimensionsSet}
            {targetWidth}
            {targetHeight}
            onEnterCropMode={enterCropMode}
            onClearCrop={clearCrop}
          />

          <QualityOutput
            quality={imageQuality}
            onQualityChange={(q) => (imageQuality = q)}
            {estimatedWidth}
            {estimatedHeight}
            showDimensions={originalWidth > 0}
          />
        </div>
      {:else if fileKind === 'video'}
        <div class="grid gap-4">
          <div class="text-sm font-medium">Convert to</div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              class="rounded-lg border border-transparent px-3 py-2 text-center text-sm bg-sky-600 dark:bg-sky-400 text-white"
            >
              GIF
            </div>
          </div>
          <details class="text-sm">
            <summary class="cursor-pointer select-none font-medium">
              Advanced options
            </summary>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <label class="block">
                <span class="text-neutral-600 dark:text-neutral-400">Width</span>
                <input
                  type="number"
                  min="16"
                  step="16"
                  placeholder="auto"
                  bind:value={gifWidth}
                  class="mt-1 w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
                />
              </label>
              <label class="block">
                <span class="text-neutral-600 dark:text-neutral-400">FPS</span>
                <input
                  type="number"
                  min="1"
                  max="60"
                  step="1"
                  placeholder="12"
                  bind:value={gifFps}
                  class="mt-1 w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
                />
              </label>
              <label class="block">
                <span class="text-neutral-600 dark:text-neutral-400">Start (s)</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0"
                  bind:value={gifStart}
                  class="mt-1 w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
                />
              </label>
              <label class="block">
                <span class="text-neutral-600 dark:text-neutral-400">Duration (s)</span>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder="auto"
                  bind:value={gifDuration}
                  class="mt-1 w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
                />
              </label>
              <label class="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  bind:checked={gifHighQuality}
                  class="accent-sky-600 dark:accent-sky-400"
                />
                <span class="text-neutral-600 dark:text-neutral-400">High quality (palette)</span>
              </label>
            </div>
          </details>
        </div>
      {:else if fileKind === 'unsupported'}
        <div class="text-sm text-red-600">
          Unsupported file type. Try an image or an MP4 video.
        </div>
      {/if}

      {#if errorMessage}
        <div class="mt-3 text-red-600 text-sm">{errorMessage}</div>
      {/if}

      <!-- Preview and Actions - only show when image is uploaded -->
      {#if imagePreviewUrl || outputUrl}
        <ImagePreview
          src={imagePreviewUrl}
          {outputUrl}
          {outputSize}
          {cropRect}
          {originalWidth}
          {originalHeight}
          {estimatedWidth}
          {estimatedHeight}
        />

        <!-- Actions -->
        <div class="mt-4 flex gap-3">
          <button
            type="button"
            class={[
              'px-4 py-2 rounded-md transition-colors',
              readyToConvert
                ? 'bg-sky-600 dark:bg-sky-400 text-white hover:bg-sky-700 dark:hover:bg-sky-300'
                : 'border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300',
            ]}
            onclick={startConversion}
            disabled={!readyToConvert}
            aria-label={working
              ? 'Converting file, please wait'
              : 'Start file conversion'}
          >
            {working ? 'Converting…' : 'Start conversion'}
          </button>
          {#if outputUrl}
            <button
              type="button"
              class="px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700"
              onclick={downloadAgain}
            >
              Download again
            </button>
          {/if}
        </div>
      {/if}
    </div>

    <footer class="mt-10 text-center text-xs text-neutral-500">
      Runs fully in your browser. Your files never leave your device.
      <div class="mt-3 text-neutral-400 dark:text-neutral-600">
        &copy; 2025 Ryan Roga
      </div>
    </footer>
  </div>

  <!-- Crop overlay modal -->
  {#if cropMode && imagePreviewUrl}
    <ImageCropper
      src={imagePreviewUrl}
      imageWidth={originalWidth}
      imageHeight={originalHeight}
      initialWidth={bothDimensionsSet ? Number(targetWidth) : undefined}
      initialHeight={bothDimensionsSet ? Number(targetHeight) : undefined}
      fixedSize={bothDimensionsSet}
      {aspectRatio}
      onConfirm={handleCropConfirm}
      onCancel={handleCropCancel}
    />
  {/if}
</section>
