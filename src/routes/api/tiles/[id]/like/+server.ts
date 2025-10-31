import prisma from '$lib/server/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// POST /api/tiles/[id]/like
export const POST: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    if (!id) {
      return json({ message: 'Tile ID is required' }, { status: 400 });
    }

    const updatedTile = await prisma.dDayTile.update({
      where: { id },
      data: {
        likes: {
          increment: 1,
        },
      },
    });

    return json(updatedTile, { status: 200 });

  } catch (error: any) {
    // Handle cases where the tile doesn't exist
    if (error.code === 'P2025') {
      return json({ message: 'Tile not found' }, { status: 404 });
    }

    console.error('Failed to like tile:', error);
    return json({ message: 'Failed to like tile' }, { status: 500 });
  }
};
