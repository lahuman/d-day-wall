<script lang="ts">
  import { onMount } from 'svelte';

  export let tile: {
    id: string;
    title: string;
    target_date: string;
    likes: number;
    color: string;
  };


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

  console.log('Tile:', tile.title, {
    targetDate: tile.target_date,
    diffDays,
    isDDayToday,
    isPastDDay
  });

  let liked = false;
  let likeCount = tile.likes;

  onMount(() => {
    const likedTiles = JSON.parse(localStorage.getItem('likedTiles') || '[]');
    if (likedTiles.includes(tile.id)) {
      liked = true;
    }
  });

  async function handleLike() {
    const likedTiles = JSON.parse(localStorage.getItem('likedTiles') || '[]');
    if (likedTiles.includes(tile.id)) {
      // For this version, we don't allow un-liking.
      return;
    }

    try {
      const response = await fetch(`/api/tiles/${tile.id}/like`, { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to like tile');
      }
      const updatedTile = await response.json();
      likeCount = updatedTile.likes;
      liked = true;
      localStorage.setItem('likedTiles', JSON.stringify([...likedTiles, tile.id]));
    } catch (error) {
      console.error(error);
    }
  }
</script>

<div class="pixel-tile" class:d-day-today={isDDayToday} class:past-d-day={isPastDDay} style="background-color: {tile.color};">
  <div class="tile-content">
    <p class="tile-title">{tile.title}</p>
    <h2 class="tile-d-day {dDayClass}">{dDayString}</h2>
  </div>
  <div class="tile-footer">
    <button class="like-button" class:liked on:click={handleLike} aria-label={liked ? '좋아요 취소' : '좋아요'}>
      <svg class="heart-icon" viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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
    border-radius: 12px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    padding: 12px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
    cursor: default;
  }

  .pixel-tile:hover {
    transform: scale(1.03);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  }

  .tile-title {
    font-size: 0.85rem;
    color: #fff;
    margin: 0;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    word-break: break-word;
    line-height: 1.4;
  }

  .tile-d-day {
    font-size: 2.25rem;
    font-weight: 900;
    margin: 4px 0 0 0;
    line-height: 1.1;
    word-break: break-all;
  }

  .tile-d-day.d-minus { color: #fff; }
  .tile-d-day.d-day   { color: #fff; }
  .tile-d-day.d-plus  { color: #ccc; }

  .tile-footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
  }

  .like-button {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 20px;
    padding: 4px 10px;
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    transition: background-color 0.2s, color 0.2s;
  }

  .like-button:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }

  .like-button .heart-icon {
    width: 14px;
    height: 14px;
    stroke: #fff;
    fill: none;
    transition: fill 0.1s, stroke 0.1s;
  }

  .like-count {
    font-size: 0.8rem;
    font-weight: 700;
    color: #fff;
  }

  .like-button.liked {
    background-color: #fff0f0;
  }
  .like-button.liked .heart-icon {
    fill: #e74c3c;
    stroke: #e74c3c;
  }
  .like-button.liked .like-count {
    color: #e74c3c;
  }

  .pixel-tile.d-day-today {
    animation: sparkle 1.5s infinite ease-in-out;
    box-shadow: 0 0 20px 5px rgba(231, 76, 60, 0.5);
  }

  .pixel-tile.past-d-day {
    opacity: 0.5;
    transition: opacity 0.3s ease-in-out;
  }

  @keyframes sparkle {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.8;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
</style>
