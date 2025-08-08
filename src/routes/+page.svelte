<script lang="ts">
  import { convertImageFile, type ImageFormat } from '$lib/converters/image'
  import { convertMp4ToGif, type Mp4ToGifOptions } from '$lib/converters/video'
  import { downloadBlob, humanFileSize } from '$lib/converters/web'

  type FileKind = 'image' | 'video' | 'unsupported' | null

  let selectedFile: File | null = null
  let fileKind: FileKind = null
  let errorMessage: string | null = null

  // Image options (simple by default)
  let imageTarget: ImageFormat = 'webp'
  let imageQuality = 0.9
  let showImageAdvanced = false

  // Video options (simple by default)
  let gifWidth: number | '' = 480
  let gifFps: number | '' = 12
  let gifStart: number | '' = ''
  let gifDuration: number | '' = ''
  let gifHighQuality = true

  let working = false
  let outputUrl: string | null = null
  let outputSize: string | null = null

  let readyToConvert = false
  $: readyToConvert = !!selectedFile && fileKind !== 'unsupported' && !working

  function detectKind(file: File): FileKind {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type === 'video/mp4') return 'video'
    return 'unsupported'
  }

  function defaultTargetForImageType(file: File): ImageFormat {
    const current = file.type.replace('image/', '')
    const candidates: ImageFormat[] = ['webp', 'avif', 'jpeg', 'png']
    const next = candidates.find((c) => c !== current)
    return next ?? 'webp'
  }

  function onPickFile(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0] ?? null
    if (!f) return
    setFile(f)
  }

  function setFile(f: File) {
    selectedFile = f
    fileKind = detectKind(f)
    errorMessage = null
    outputUrl = null
    outputSize = null
    if (fileKind === 'image') {
      imageTarget = defaultTargetForImageType(f)
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer?.files?.[0]
    if (f) setFile(f)
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault()
  }

  async function onStartConversion() {
    if (!selectedFile || !fileKind || fileKind === 'unsupported') return
    working = true
    outputUrl = null
    outputSize = null
    errorMessage = null
    try {
      if (fileKind === 'image') {
        const blob = await convertImageFile(selectedFile, {
          targetFormat: imageTarget,
          quality: imageQuality,
        })
        outputUrl = URL.createObjectURL(blob)
        outputSize = humanFileSize(blob.size)
        autoDownload(blob, renameFile(selectedFile.name, imageTarget))
      } else if (fileKind === 'video') {
        const opts: Mp4ToGifOptions = {
          width: gifWidth === '' ? undefined : Number(gifWidth),
          fps: gifFps === '' ? undefined : Number(gifFps),
          start: gifStart === '' ? undefined : Number(gifStart),
          duration: gifDuration === '' ? undefined : Number(gifDuration),
          highQuality: gifHighQuality,
        }
        const blob = await convertMp4ToGif(selectedFile, opts)
        outputUrl = URL.createObjectURL(blob)
        outputSize = humanFileSize(blob.size)
        autoDownload(blob, renameFile(selectedFile.name, 'gif'))
      }
    } catch (err) {
      errorMessage = (err as Error).message
    } finally {
      working = false
    }
  }

  function autoDownload(blob: Blob, filename: string) {
    downloadBlob(blob, filename)
  }

  function renameFile(original: string, newExt: string): string {
    const idx = original.lastIndexOf('.')
    const base = idx > 0 ? original.slice(0, idx) : original
    return `${base}.${newExt}`
  }

  function downloadAgain() {
    if (!outputUrl) return
    const currentFile = selectedFile
    if (!currentFile) return
    fetch(outputUrl).then(async (res) => {
      const blob = await res.blob()
      const ext = fileKind === 'image' ? imageTarget : 'gif'
      downloadBlob(blob, renameFile(currentFile.name, ext as string))
    })
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
          class="hidden"
          on:change={onPickFile}
        />
        <label
          for="file-input"
          class="block cursor-pointer rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-800/40 px-6 py-12 text-center hover:bg-neutral-100/60 dark:hover:bg-neutral-800"
          on:drop={onDrop}
          on:dragover={onDragOver}
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
            {#each ['png', 'jpeg', 'webp', 'avif'] as f}
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
                  {f.toUpperCase()}
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
          on:click|preventDefault={onStartConversion}
          disabled={!selectedFile || fileKind === 'unsupported' || working}
        >
          {working ? 'Converting…' : 'Start conversion'}
        </button>
        {#if outputUrl}
          <button
            class="px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700"
            on:click|preventDefault={downloadAgain}
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
