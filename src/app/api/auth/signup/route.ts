import { signUp } from '@/lib/server/auth';
import { readJson, route } from '@/lib/server/http';

export const POST = route(async (request: Request) => Response.json({ user: await signUp(await readJson(request)) }, { status: 201 }));
