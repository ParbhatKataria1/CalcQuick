import { getCurrentUser, toPublicUser } from '@/lib/server/auth';
import { route } from '@/lib/server/http';

export const GET = route(async () => {
  const user = await getCurrentUser();
  return Response.json({ user: user ? toPublicUser(user) : null }, { status: user ? 200 : 401 });
});
