import { logOut } from '@/lib/server/auth';
import { route } from '@/lib/server/http';

export const POST = route(async () => {
  await logOut();
  return Response.json({ user: null });
});
