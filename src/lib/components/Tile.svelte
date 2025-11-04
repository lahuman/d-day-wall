<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';

  export let tile: {
    id: string;
    title: string;
    target_date: string;
    likes: number;
    color: string;
  };

  // --- Color & Style Helpers ---
  function getContrastColor(hexcolor: string): '#FFFFFF' | '#212529' {
    if (hexcolor.slice(0, 1) === '#') {
      hexcolor = hexcolor.slice(1);
    }
    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#212529' : '#FFFFFF';
  }

  function lightenColor(hex: string, percent: number): string {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    r = Math.min(255, r + Math.round((255 - r) * (percent / 100)));
    g = Math.min(255, g + Math.round((255 - g) * (percent / 100)));
    b = Math.min(255, b + Math.round((255 - b) * (percent / 100)));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  const textColor = getContrastColor(tile.color);
  const gradientColor = lightenColor(tile.color, 20);
  const glowColor = tile.color.replace('#', '');

  // --- D-Day Calculation ---
  function calculateDday(targetDateStr: string): { diffDays: number; dDayString: string; dDayClass: string } {
    const targetDate = new Date(targetDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let dDayString = '';
    let dDayClass = '';

    if (diffDays === 0) {
      dDayString = 'D-Day';
      dDayClass = 'd-day';
    } else if (diffDays > 0) {
      dDayString = `D-${diffDays}`;
      dDayClass = 'd-minus';
    } else {
      dDayString = `D+${Math.abs(diffDays)}`;
      dDayClass = 'd-plus';
    }
    return { diffDays, dDayString, dDayClass };
  }

  const { diffDays, dDayString, dDayClass } = calculateDday(tile.target_date);
  const isDDayToday = diffDays === 0;
  const isPastDDay = diffDays < 0;

  // --- Like Functionality ---
  let liked = false;
  let likeCount = tile.likes;
  let showLikeAnimation = false;

  onMount(() => {
    const likedTiles = JSON.parse(localStorage.getItem('likedTiles') || '[]');
    if (likedTiles.includes(tile.id)) {
      liked = true;
    }
  });

  async function handleLike() {
    const likedTiles = JSON.parse(localStorage.getItem('likedTiles') || '[]');
    if (likedTiles.includes(tile.id)) return;

    showLikeAnimation = true;
    setTimeout(() => showLikeAnimation = false, 600);

    try {
      const response = await fetch(`/api/tiles/${tile.id}/like`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to like tile');
      
      const updatedTile = await response.json();
      likeCount = updatedTile.likes;
      liked = true;
      localStorage.setItem('likedTiles', JSON.stringify([...likedTiles, tile.id]));
    } catch (error) {
      console.error(error);
    }
  }
</script>

<div 
  class="pixel-tile" 
  class:d-day-today={isDDayToday} 
  class:past-d-day={isPastDDay}
  style:--tile-color={tile.color}
  style:--gradient-color={gradientColor}
  style:--text-color={textColor}
  style:--glow-color-rgb={parseInt(glowColor.slice(0,2),16)},{parseInt(glowColor.slice(2,4),16)},{parseInt(glowColor.slice(4,6),16)}
>
  <div class="tile-content">
    <p class="tile-title">{tile.title}</p>
    <h2 class="tile-d-day {dDayClass}">{dDayString}</h2>
  </div>
  <div class="tile-footer">
    <button class="like-button" class:liked on:click={handleLike} aria-label={liked ? 'Liked' : 'Like'}>
      {#if showLikeAnimation}
        <div class="like-feedback" transition:fade={{duration: 300}}>+1</div>
      {/if}
      <svg class="heart-icon" viewBox="0 0 24 24">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>
      <span class="like-count">{likeCount}</span>
    </button>
  </div>
</div>

<style>
  .pixel-tile {
    width: 150px;
    height: 150px;
    border-radius: 16px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    cursor: default;
    color: var(--text-color);
    background: linear-gradient(135deg, var(--tile-color), var(--gradient-color));
    box-shadow: 0 4px 15px rgba(var(--glow-color-rgb), 0.2), 0 2px 5px rgba(0,0,0,0.1);
    transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), 
                box-shadow 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    position: relative;
  }

  .pixel-tile:hover {
    transform: scale(1.05) translateY(-2px);
    box-shadow: 0 10px 30px rgba(var(--glow-color-rgb), 0.35), 0 4px 8px rgba(0,0,0,0.15);
  }

  .tile-title {
    font-size: 0.85rem;
    margin: 0;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 5;
    -webkit-box-orient: vertical;
    word-break: break-word;
    line-height: 1.4;
    text-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .tile-d-day {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 2.5rem;
    font-weight: 700;
    margin: 4px 0 0 0;
    line-height: 1;
    word-break: break-all;
    text-shadow: 0 2px 4px rgba(0,0,0,0.15);
  }

  .tile-d-day.d-plus {
    opacity: 0.7;
  }

  .tile-footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    position: relative;
  }

  .like-button {
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    padding: 4px 10px;
    display: flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
    transition: all 0.25s ease;
    backdrop-filter: blur(3px);
  }

  .like-button:hover {
    background-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
  }
  
  .like-button:active {
    transform: scale(0.95);
  }

  .like-button .heart-icon {
    width: 15px;
    height: 15px;
    stroke: var(--text-color);
    stroke-width: 2;
    fill: none;
    transition: fill 0.2s ease, stroke 0.2s ease;
  }

  .like-count {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text-color);
  }

  .like-button.liked {
    background-color: #ffffff;
    animation: liked-pop 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  }
  .like-button.liked .heart-icon {
    fill: #e53935;
    stroke: #e53935;
  }
  .like-button.liked .like-count {
    color: #c62828;
  }

  .like-feedback {
    position: absolute;
    right: 10px;
    top: -25px;
    font-size: 1.2rem;
    font-weight: bold;
    color: #e53935;
    user-select: none;
  }

  .pixel-tile.d-day-today {
    animation: dday-glow 1.8s infinite alternate;
  }
  
  .pixel-tile.past-d-day {
    filter: grayscale(80%);
    opacity: 0.6;
  }

  @keyframes dday-glow {
    from {
      box-shadow: 0 0 5px rgba(var(--glow-color-rgb), 0.3), 
                  0 0 10px rgba(var(--glow-color-rgb), 0.2),
                  0 0 20px rgba(255, 255, 255, 0.5);
    }
    to {
      box-shadow: 0 0 15px rgba(var(--glow-color-rgb), 0.6), 
                  0 0 30px rgba(var(--glow-color-rgb), 0.4),
                  0 0 40px rgba(255, 255, 255, 0.7);
    }
  }

  @keyframes liked-pop {
    0% { transform: scale(1); }
    50% { transform: scale(1.15); }
    100% { transform: scale(1); }
  }
</style>
