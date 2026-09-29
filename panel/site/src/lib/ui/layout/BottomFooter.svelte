<script lang="ts">
  import { onMount } from 'svelte';
  import { getPublicConfig, type PublicConfig } from '$lib/api/auth';

  let config = $state<PublicConfig | null>(null);

  onMount(async () => {
    try {
      config = await getPublicConfig();
    } catch {
      config = {
        panel_name: "Hex Panel",
        label_made_by: "N1N4U",
        discord: "https://discord.com/users/1093946948928680008",
        github: "https://github.com/N1N4U/Hex",
        feedback: "https://github.com/N1N4U/Hex",
        auth: { password: true, discord: false, google: false, gmail: false }
      };
    }
  });

  const madeBy = $derived(config?.label_made_by || 'N1N4U');
  const discordUrl = $derived(config?.discord || 'https://discord.com/users/1093946948928680008');
  const githubUrl = $derived(config?.github || 'https://github.com/N1N4U/Hex');
  const feedbackUrl = $derived(config?.feedback || 'https://github.com/N1N4U/Hex');
</script>

<footer class="bottom-footer" aria-label="System status footer">
  <div class="footer-left">
    <span class="brand-title">Hex</span>
    <span class="sep">|</span>
    <span class="made-by">MADE BY {madeBy}</span>
  </div>

  <div class="footer-right">
    {#if discordUrl}
      <a href={discordUrl} target="_blank" rel="noopener noreferrer" class="footer-link">Discord</a>
    {/if}
    {#if githubUrl}
      <a href={githubUrl} target="_blank" rel="noopener noreferrer" class="footer-link">GitHub</a>
    {/if}
    {#if feedbackUrl}
      <a href={feedbackUrl} target="_blank" rel="noopener noreferrer" class="footer-link">Feedback</a>
    {/if}
  </div>
</footer>

<style>
  .bottom-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 22px;
    z-index: 45;
    background: rgba(6, 8, 12, 0.88);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    font-size: 11px;
    line-height: 1;
    color: rgba(255, 255, 255, 0.55);
    user-select: none;
    font-family: var(--font-sans);
    box-sizing: border-box;
  }

  .footer-left {
    display: flex;
    align-items: center;
    gap: 8px;
    letter-spacing: 0.04em;
  }

  .brand-title {
    font-weight: 700;
    color: rgba(255, 255, 255, 0.85);
  }

  .sep {
    opacity: 0.3;
  }

  .made-by {
    font-weight: 500;
    letter-spacing: 0.06em;
    font-size: 10.5px;
    color: rgba(255, 255, 255, 0.65);
  }

  .footer-right {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .footer-link {
    color: rgba(255, 255, 255, 0.55);
    text-decoration: none;
    transition: color 120ms ease;
    font-weight: 500;
  }

  .footer-link:hover {
    color: #ffffff;
    text-decoration: underline;
  }

  @media (max-width: 480px) {
    .bottom-footer {
      font-size: 10px;
      padding: 0 8px;
    }
    .footer-right {
      gap: 8px;
    }
  }
</style>
