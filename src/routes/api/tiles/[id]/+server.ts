import prisma from '$lib/server/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/tiles/[id]
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    if (!id) {
      return json({ message: 'Tile ID is required' }, { status: 400 });
    }

    const tile = await prisma.dDayTile.findUnique({
      where: { id },
    });

    if (!tile) {
      return json({ message: 'Tile not found' }, { status: 404 });
    }

    return json(tile, { status: 200 });

  } catch (error: any) {
    console.error('Failed to fetch tile:', error);
    return json({ message: 'Failed to fetch tile' }, { status: 500 });
  }
};
