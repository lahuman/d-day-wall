<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { t } from 'svelte-i18n';

  export let show = false;
  export let coord_x: number | null = null;
  export let coord_y: number | null = null;
  export let isSubmitting = false;

  export let title = '';
  export let target_date = '';
  let selectedColor = '#ef4444';
  let minDate: string;
  let dateError: string | null = null;

  onMount(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    minDate = `${yyyy}-${mm}-${dd}`;
    target_date = minDate;
  });

  const colors = [
    { name: 'Red', value: '#ef4444' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Pink', value: '#ec4899' },
  ];

  const dispatch = createEventDispatcher();

  function handleSubmit() {
    dateError = null; // Clear previous errors

    if (!title || !target_date) {
      alert($t('registration_modal.alert_all_fields'));
      return;
    }

    const [year, month, day] = target_date.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(today.getFullYear() + 1);
    oneYearFromNow.setHours(0, 0, 0, 0);

    if (selectedDate <= today) {
      dateError = $t('registration_modal.error_date_past');
      return;
    }

    if (selectedDate > oneYearFromNow) {
      dateError = $t('registration_modal.error_date_future');
      return;
    }

    dispatch('submit', { title, target_date, color: selectedColor });
  }

  function handleClose() {
    if (isSubmitting) return;
    dispatch('close');
  }
</script>

{#if show}
  <div class="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm" on:click={handleClose}>
    <div class="w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-2xl p-8 m-4" on:click|stopPropagation>
      <h3 class="text-2xl font-bold text-gray-900 mb-6">{$t('registration_modal.title')}</h3>
      <form class="space-y-6" on:submit|preventDefault={handleSubmit}>
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-2" for="event-title">{$t('registration_modal.event_title_label')}</label>
          <input class="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-primary transition" id="event-title" maxlength="30" name="event-title" placeholder={$t('registration_modal.event_title_placeholder')} type="text" bind:value={title} />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-2" for="d-day-date">{$t('registration_modal.date_label')}</label>
          <input class="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-primary transition" id="d-day-date" name="d-day-date" type="date" bind:value={target_date} min={minDate} on:input={() => dateError = null} />
          {#if dateError}
            <p class="text-red-500 text-sm mt-1">{dateError}</p>
          {/if}
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-2">{$t('registration_modal.color_label')}</label>
          <div class="grid grid-cols-6 gap-3">
            {#each colors as color}
              <button class="aspect-square rounded-full" style="background-color: {color.value}" class:ring-2={selectedColor === color.value} class:ring-offset-2={selectedColor === color.value} class:ring-offset-white={selectedColor === color.value} class:ring-gray-900={selectedColor === color.value} on:click={() => selectedColor = color.value} data-alt="{color.name} color swatch" type="button"></button>
            {/each}
          </div>
        </div>
        <div class="text-center text-xs text-gray-500 pt-4">
          <p>{$t('registration_modal.help_text')}</p>
        </div>
        <div class="flex items-center gap-4 pt-4">
          <button class="w-full flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-4 border border-gray-300 bg-transparent text-base font-bold leading-normal tracking-[0.015em] text-gray-800 transition hover:bg-gray-100" type="button" on:click={handleClose}>
            <span class="truncate">{$t('registration_modal.cancel_button')}</span>
          </button>
          <button class="w-full flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-4 bg-blue-600 text-white text-base font-bold leading-normal tracking-[0.015em] transition hover:bg-blue-700" type="submit" disabled={isSubmitting}>
            <span class="truncate">{isSubmitting ? $t('registration_modal.submit_button_processing') : $t('registration_modal.submit_button')}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
