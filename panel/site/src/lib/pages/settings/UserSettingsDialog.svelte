<script lang="ts">
  import Dialog from '$lib/ui/overlay/Dialog.svelte';
  import Button from '$lib/ui/primitives/Button.svelte';
  import { closeDialog } from '$lib/ui/overlay/dialogStore.svelte';
  import { wallpaperStore } from '$lib/stores/wallpaper.svelte';
  import { addToast } from '$lib/ui/feedback/toastStore.svelte';
  import { Image, Sliders, Monitor } from '@lucide/svelte';
  import defaultWallpaper from '$lib/assects/wallpaper/snowy-mountain-sunset.jpg';

  let customUrl = $state(wallpaperStore.url);
  let tintValue = $state(wallpaperStore.tint);
  let blurValue = $state(wallpaperStore.blur);

  function handleTintChange(e: Event) {
    const val = parseFloat((e.target as HTMLInputElement).value);
    tintValue = val;
    wallpaperStore.setTint(val);
  }

  function handleBlurChange(e: Event) {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    blurValue = val;
    wallpaperStore.setBlur(val);
  }

  function applyCustomUrl() {
    if (customUrl.trim()) {
      wallpaperStore.setWallpaper(customUrl.trim());
      addToast('Wallpaper updated', 'success');
    }
  }

  function resetToDefault() {
    wallpaperStore.setWallpaper(defaultWallpaper);
    wallpaperStore.setTint(0.55);
    wallpaperStore.setBlur(0);
    tintValue = 0.55;
    blurValue = 0;
    customUrl = defaultWallpaper;
    addToast('Reset to default wallpaper', 'info');
  }
</script>

<Dialog title="User Preferences" size="md" onclose={() => closeDialog()}>
  <div class="user-settings-content">
    <!-- Section 1: Wallpaper -->
    <div class="pref-section">
      <div class="section-title-row">
        <Image size={16} class="text-accent" />
        <h4 class="section-heading">Personal Wallpaper</h4>
      </div>

      <div class="wallpaper-preview-box" style="background-image: url('{wallpaperStore.url}');">
        <div class="preview-tint" style="background: rgba(0,0,0, {tintValue}); backdrop-filter: blur({blurValue}px);">
          <span class="preview-label">Live Preview</span>
        </div>
      </div>

      <div class="control-row">
        <div class="control-label-row">
          <span>Dark Tint Opacity</span>
          <span class="val-badge">{Math.round(tintValue * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={tintValue}
          oninput={handleTintChange}
          class="range-slider"
        />
      </div>

      <div class="control-row">
        <div class="control-label-row">
          <span>Background Blur</span>
          <span class="val-badge">{blurValue}px</span>
        </div>
        <input
          type="range"
          min="0"
          max="30"
          step="1"
          value={blurValue}
          oninput={handleBlurChange}
          class="range-slider"
        />
      </div>

      <div class="url-input-wrap">
        <input
          type="text"
          placeholder="Custom Image URL (https://...)"
          bind:value={customUrl}
          class="url-input"
        />
        <Button variant="secondary" size="sm" onclick={applyCustomUrl}>Apply</Button>
        <Button variant="ghost" size="sm" onclick={resetToDefault}>Reset</Button>
      </div>
    </div>

    <!-- Section 2: Client Interface Preferences -->
    <div class="pref-section">
      <div class="section-title-row">
        <Monitor size={16} class="text-accent" />
        <h4 class="section-heading">Client Interface</h4>
      </div>

      <div class="pref-toggle-row">
        <div>
          <div class="pref-name">Animations & Transitions</div>
          <div class="pref-desc">Enable smooth spring motion and magnification</div>
        </div>
        <input type="checkbox" checked class="pref-checkbox" />
      </div>

      <div class="pref-toggle-row">
        <div>
          <div class="pref-name">Sound Feedback</div>
          <div class="pref-desc">Play soft click feedback on button actions</div>
        </div>
        <input type="checkbox" class="pref-checkbox" />
      </div>
    </div>
  </div>
</Dialog>

<style>
  .user-settings-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
    font-family: var(--font-sans);
  }

  .pref-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .section-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-heading {
    font-size: 14px;
    font-weight: 700;
    color: #f8fafc;
    margin: 0;
  }

  .wallpaper-preview-box {
    width: 100%;
    height: 110px;
    border-radius: 10px;
    background-size: cover;
    background-position: center;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .preview-tint {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 150ms ease;
  }

  .preview-label {
    font-size: 12px;
    font-weight: 600;
    color: #ffffff;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
    background: rgba(0, 0, 0, 0.4);
    padding: 3px 8px;
    border-radius: 4px;
  }

  .control-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .control-label-row {
    display: flex;
    justify-content: space-between;
    font-size: 12.5px;
    color: #cbd5e1;
  }

  .val-badge {
    font-family: var(--font-mono, monospace);
    color: #38bdf8;
    font-size: 12px;
  }

  .range-slider {
    width: 100%;
    accent-color: #38bdf8;
    cursor: pointer;
  }

  .url-input-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  }

  .url-input {
    flex: 1;
    height: 34px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    padding: 0 10px;
    color: #ffffff;
    font-size: 13px;
    outline: none;
  }

  .url-input:focus {
    border-color: #38bdf8;
  }

  .pref-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
  }

  .pref-name {
    font-size: 13px;
    font-weight: 600;
    color: #f1f5f9;
  }

  .pref-desc {
    font-size: 11.5px;
    color: #64748b;
  }

  .pref-checkbox {
    width: 16px;
    height: 16px;
    accent-color: #22c55e;
    cursor: pointer;
  }
</style>
