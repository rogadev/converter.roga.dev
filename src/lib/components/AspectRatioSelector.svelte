<script lang="ts">
  interface AspectRatioOption {
    label: string
    value: number | null
  }

  interface Props {
    ratios?: readonly AspectRatioOption[]
    selected: number | null
    onchange: (value: number | null) => void
  }

  const DEFAULT_RATIOS: readonly AspectRatioOption[] = [
    { label: 'None', value: null },
    { label: '1:1', value: 1 },
    { label: '4:3', value: 4 / 3 },
    { label: '3:2', value: 3 / 2 },
    { label: '16:9', value: 16 / 9 },
    { label: '9:16', value: 9 / 16 },
    { label: '3:4', value: 3 / 4 },
    { label: '2:3', value: 2 / 3 },
  ]

  let { ratios = DEFAULT_RATIOS, selected, onchange }: Props = $props()
</script>

<div class="border-t border-neutral-200 dark:border-neutral-800 pt-4">
  <p class="text-sm font-medium mb-3" id="aspect-ratio-label">Aspect ratio</p>
  <div
    class="flex flex-wrap gap-2"
    role="group"
    aria-labelledby="aspect-ratio-label"
  >
    {#each ratios as ratio (ratio.label)}
      <button
        type="button"
        onclick={() => onchange(ratio.value)}
        aria-pressed={selected === ratio.value}
        class={[
          'px-3 py-1.5 rounded-md text-sm border transition-colors',
          selected === ratio.value
            ? 'bg-sky-600 dark:bg-sky-400 text-white border-transparent'
            : 'border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800',
        ]}
      >
        {ratio.label}
      </button>
    {/each}
  </div>
  <p class="text-xs text-neutral-500 mt-2">
    Lock crop to a specific ratio. Corners will resize while maintaining
    proportion.
  </p>
</div>
