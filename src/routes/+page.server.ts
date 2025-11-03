import { prisma } from '$lib/server/prisma';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const tileId = url.searchParams.get('tile');

  if (tileId) {
    try {
      const tile = await prisma.DDayTile.findUnique({
        where: { id: tileId },
      });

      if (tile) {
        return {
          sharedTile: {
            id: tile.id,
            title: tile.title,
            target_date: tile.target_date.toISOString(),
            coord_x: tile.coord_x,
            coord_y: tile.coord_y,
            color: tile.color,
            likes: tile.likes,
            created_at: tile.created_at.toISOString(),
          },
        };
      }
    } catch (error) {
      console.error('Failed to fetch shared tile on server:', error);
    }
  }

  return {
    sharedTile: null,
  };
};
