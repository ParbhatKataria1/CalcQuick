import { logIn } from '@/lib/server/auth';
import { readJson, route } from '@/lib/server/http';

export const POST = route(async (request: Request) => Response.json({ user: await logIn(await readJson(request)) }));
