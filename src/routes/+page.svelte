<script lang="ts">
  import { downloadBlob, humanFileSize, renameFile } from '$lib/converters/web'
  import { ConversionService } from '$lib/conversion-service'
  import {
    detectFileKind,
    getDefaultImageTarget,
    formatImageLabel,
  } from '$lib/file-utils'
  import { handleConversionError } from '$lib/error-handler'
  import type { FileKind, ImageFormat } from '$lib/types'
  import { IMAGE_FORMATS } from '$lib/types'

  // Core state
  let selectedFile = $state<File | null>(null)
  let fileKind = $state<FileKind>(null)
  let errorMessage = $state<string | null>(null)
  let working = $state(false)
  let outputUrl = $state<string | null>(null)
  let outputSize = $state<string | null>(null)

  // Default conversion settings
  const DEFAULT_IMAGE_QUALITY = 0.9
  const DEFAULT_GIF_WIDTH = 480
  const DEFAULT_GIF_FPS = 12

  // Conversion settings
  let imageTarget = $state<ImageFormat>('webp')
  let imageQuality = $state(DEFAULT_IMAGE_QUALITY)
  let gifWidth = $state<number | ''>(DEFAULT_GIF_WIDTH)
  let gifFps = $state<number | ''>(DEFAULT_GIF_FPS)
  let gifStart = $state<number | ''>('')
  let gifDuration = $state<number | ''>('')
  let gifHighQuality = $state(true)

  // Derived values using Svelte 5 runes
  let readyToConvert = $derived(
    !!selectedFile && fileKind !== 'unsupported' && !working
  )

  // Event handlers
  function onPickFile(e: Event): void {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0] ?? null
    if (!file) return
    setFile(file)
  }

  function onDrop(e: DragEvent): void {
    e.preventDefault()
    const file = e.dataTransfer?.files?.[0]
    if (file) setFile(file)
  }

  function onDragOver(e: DragEvent): void {
    e.preventDefault()
  }

  function resetConversionState(): void {
    errorMessage = null
    outputUrl = null
    outputSize = null
  }

  function resetConversionSettings(kind: FileKind): void {
    if (kind === 'image') {
      imageQuality = DEFAULT_IMAGE_QUALITY
    } else if (kind === 'video') {
      gifWidth = DEFAULT_GIF_WIDTH
      gifFps = DEFAULT_GIF_FPS
      gifStart = ''
      gifDuration = ''
      gifHighQuality = true
    }
  }

  function setFile(file: File): void {
    selectedFile = file
    fileKind = detectFileKind(file)
    resetConversionState()

    if (fileKind === 'image') {
      imageTarget = getDefaultImageTarget(file)
    }
    resetConversionSettings(fileKind)
  }

  // Conversion functions
  async function onStartConversion(e: Event): Promise<void> {
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

  async function downloadAgain(e: Event): Promise<void> {
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
  <title>File Converter</title>
  <meta
    name="description"
    content="Drop a file or click to upload. Pick an option, then start conversion."
  />
</svelte:head>

<section
  class="min-h-dvh bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
>
  <div class="mx-auto max-w-3xl px-6 py-12">
    <header class="mb-10 text-center">
      <h1 class="text-3xl md:text-5xl font-semibold tracking-tight">
        File Converter
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
          onchange={onPickFile}
        />
        <label
          for="file-input"
          class="block cursor-pointer rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-800/40 px-6 py-12 text-center hover:bg-neutral-100/60 dark:hover:bg-neutral-800"
          ondrop={onDrop}
          ondragover={onDragOver}
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

      <!-- Options -->
      {#if fileKind === 'image'}
        <div class="grid gap-4">
          <div class="text-sm font-medium">Choose output format</div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {#each IMAGE_FORMATS as f}
              <label class="group relative">
                <input
                  type="radio"
                  name="image-format"
                  value={f}
                  bind:group={imageTarget}
                  class="peer hidden"
                />
                <div
                  class="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-center text-sm transition-colors peer-checked:bg-sky-600 dark:peer-checked:bg-sky-400 peer-checked:text-white group-hover:bg-neutral-100 dark:group-hover:bg-neutral-800"
                >
                  {formatImageLabel(f)}
                </div>
              </label>
            {/each}
          </div>
          <details class="text-sm">
            <summary class="cursor-pointer select-none">Advanced</summary>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <label class="block">
                <span>Quality</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  bind:value={imageQuality}
                  class="w-full mt-2"
                />
              </label>
            </div>
          </details>
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
            <summary class="cursor-pointer select-none">Advanced</summary>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <label class="block">
                <span>Width</span>
                <input
                  type="number"
                  min="16"
                  step="16"
                  placeholder="auto"
                  bind:value={gifWidth}
                  class="mt-2 w-full"
                />
              </label>
              <label class="block">
                <span>FPS</span>
                <input
                  type="number"
                  min="1"
                  max="60"
                  step="1"
                  placeholder="12"
                  bind:value={gifFps}
                  class="mt-2 w-full"
                />
              </label>
              <label class="block">
                <span>Start (s)</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0"
                  bind:value={gifStart}
                  class="mt-2 w-full"
                />
              </label>
              <label class="block">
                <span>Duration (s)</span>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder="auto"
                  bind:value={gifDuration}
                  class="mt-2 w-full"
                />
              </label>
              <label class="inline-flex items-center gap-2">
                <input type="checkbox" bind:checked={gifHighQuality} />
                High quality (palette)
              </label>
            </div>
          </details>
        </div>
      {:else if fileKind === 'unsupported'}
        <div class="text-sm text-red-600">
          Unsupported file type. Try an image or an MP4 video.
        </div>
      {/if}

      <!-- Actions -->
      <div class="mt-6 flex gap-3">
        <button
          class={`px-4 py-2 rounded-md transition-colors ${readyToConvert ? 'bg-sky-600 dark:bg-sky-400 text-white hover:bg-sky-700 dark:hover:bg-sky-300' : 'border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'}`}
          onclick={onStartConversion}
          disabled={!readyToConvert}
          aria-label={working
            ? 'Converting file, please wait'
            : 'Start file conversion'}
        >
          {working ? 'Converting…' : 'Start conversion'}
        </button>
        {#if outputUrl}
          <button
            class="px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700"
            onclick={downloadAgain}
          >
            Download again
          </button>
        {/if}
      </div>

      {#if errorMessage}
        <div class="mt-3 text-red-600 text-sm">{errorMessage}</div>
      {/if}

      <!-- Preview -->
      <div class="mt-6">
        <div
          class="aspect-video rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 grid place-items-center overflow-hidden bg-neutral-50 dark:bg-neutral-800"
        >
          {#if outputUrl}
            <img
              src={outputUrl}
              alt="Output"
              class="object-contain w-full h-full"
            />
          {:else}
            <span class="text-neutral-500 text-sm">Output preview</span>
          {/if}
        </div>
        {#if outputUrl}
          <div class="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
            {outputSize}
          </div>
        {/if}
      </div>
    </div>

    <footer class="mt-10 text-center text-xs text-neutral-500">
      Runs fully in your browser. Your files never leave your device.
    </footer>
  </div>
</section>
