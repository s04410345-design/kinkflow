import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/serverAuth';

export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    if ('response' in auth) return auth.response;

    const body = await req.json();
    const newName = typeof body.newName === 'string' ? body.newName.trim() : '';
    if (!newName || newName.length > 80) {
      return NextResponse.json({ error: 'Name must be between 1 and 80 characters' }, { status: 400 });
    }

    const cleanName = newName.replace(/ ☑️/g, '').replace(/ 👻/g, '').trim();
    const { error } = await auth.client
      .from('profiles')
      .update({ username: cleanName })
      .eq('id', auth.user.id);
    if (error) {
      console.error('[renameUser] profile update failed:', error.message);
      return NextResponse.json({ error: 'Unable to update profile name' }, { status: 400 });
    }

    const { error: authError } = await auth.client.auth.updateUser({
      data: { display_name: cleanName },
    });
    if (authError) console.warn('[renameUser] auth metadata update failed:', authError.message);

    return NextResponse.json({ success: true, name: cleanName });
  } catch (error) {
    console.error('[renameUser] unexpected error:', error);
    return NextResponse.json({ error: 'Unable to update profile name' }, { status: 500 });
  }
}
