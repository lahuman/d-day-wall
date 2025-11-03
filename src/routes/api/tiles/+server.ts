import { prisma } from '$lib/server/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/tiles
export const GET: RequestHandler = async ({ url }) => {
  try {
    const since = url.searchParams.get('since');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const where: any = {
      target_date: {
        gte: sevenDaysAgo,
      },
    };

    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        where.updated_at = {
          gt: sinceDate,
        };
      }
    }

    const tiles = await prisma.dDayTile.findMany({
      where,
    });
    return json(tiles);
  } catch (error) {
    console.error('Failed to fetch tiles:', error);
    return json({ message: 'Failed to fetch tiles' }, { status: 500 });
  }
};

// POST /api/tiles
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { title, target_date, coord_x, coord_y, color } = await request.json();

    // --- Validation ---
    if (!title || !target_date || coord_x === undefined || coord_y === undefined || !color) {
      return json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Title length validation
    if (title.length > 50) {
      return json({ message: 'Title cannot exceed 50 characters' }, { status: 400 });
    }

    // Coordinate range validation
    if (coord_x < 0 || coord_x >= 60 || coord_y < 0 || coord_y >= 60) {
      return json({ message: 'Coordinates must be between 0 and 59' }, { status: 400 });
    }

    // Color format validation (basic hex color check)
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexColorRegex.test(color)) {
      return json({ message: 'Invalid color format. Must be a hex color like #RRGGBB or #RGB.' }, { status: 400 });
    }

    const targetDate = new Date(target_date);
    const now = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(now.getFullYear() + 1);

    if (targetDate <= now) {
      return json({ message: 'Target date must be in the future' }, { status: 400 });
    }

    if (targetDate > oneYearFromNow) {
      return json({ message: 'Target date cannot be more than one year from now' }, { status: 400 });
    }
    // --- End Validation ---

    const newTile = await prisma.dDayTile.create({
      data: {
        title,
        target_date: targetDate,
        coord_x,
        coord_y,
        color,
      },
    });

    return json(newTile, { status: 201 });

  } catch (error: any) {
    // Prisma unique constraint violation
    if (error.code === 'P2002') {
      return json({ message: 'Coordinates already taken' }, { status: 409 }); // 409 Conflict
    }

    console.error('Failed to create tile:', error);
    return json({ message: 'Failed to create tile' }, { status: 500 });
  }
};
