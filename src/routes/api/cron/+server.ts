import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import prisma from '$lib/server/prisma';
import { CRON_SECRET } from '$env/static/private';

// Cron Job to delete old tiles
// GET /api/cron
export const GET: RequestHandler = async ({ request }) => {
  // 1. Authenticate the request
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return json({ message: 'Unauthorized' }, { status: 401 });
  }

  // 2. Calculate the cutoff date (7 days ago)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // 3. Delete old tiles
  try {
    const { count } = await prisma.dDayTile.deleteMany({
      where: {
        target_date: {
          lt: sevenDaysAgo, // 'lt' means less than
        },
      },
    });

    return json({ message: `Successfully deleted ${count} old tiles.` });

  } catch (error) {
    console.error('Cron job failed:', error);
    return json({ message: 'Failed to delete old tiles' }, { status: 500 });
  }
};
