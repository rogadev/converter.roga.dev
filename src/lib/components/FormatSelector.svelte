<script lang="ts">
  import type { ImageFormat } from '$lib/types'
  import { IMAGE_FORMATS } from '$lib/types'
  import { formatImageLabel } from '$lib/file-utils'

  interface Props {
    selected: ImageFormat
    onchange: (format: ImageFormat) => void
  }

  let { selected, onchange }: Props = $props()
</script>

<div>
  <div class="text-sm font-medium mb-3">Output format</div>
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
    {#each IMAGE_FORMATS as format}
      <label class="group relative">
        <input
          type="radio"
          name="image-format"
          value={format}
          checked={selected === format}
          onchange={() => onchange(format)}
          class="peer hidden"
        />
        <div
          class="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-center text-sm transition-colors peer-checked:bg-sky-600 dark:peer-checked:bg-sky-400 peer-checked:text-white group-hover:bg-neutral-100 dark:group-hover:bg-neutral-800"
        >
          {formatImageLabel(format)}
        </div>
      </label>
    {/each}
  </div>
</div>

