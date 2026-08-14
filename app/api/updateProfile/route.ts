import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/serverAuth';

export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    if ('response' in auth) return auth.response;

    const body = await req.json();
    const requestedUserId = typeof body.userId === 'string' ? body.userId : auth.user.id;
    if (requestedUserId !== auth.user.id) {
      return NextResponse.json({ error: 'You can only update your own profile' }, { status: 403 });
    }

    const targetName = typeof body.targetName === 'string' ? body.targetName.trim() : '';
    const bio = typeof body.bio === 'string' ? body.bio.slice(0, 2000) : '';
    const gender = typeof body.gender === 'string' ? body.gender.slice(0, 40) : null;
    const bdsmRole = typeof body.bdsmRole === 'string' ? body.bdsmRole.slice(0, 80) : null;
    const editAvatarUrl = typeof body.editAvatarUrl === 'string' ? body.editAvatarUrl.slice(0, 2048) : null;
    const editCoverUrl = typeof body.editCoverUrl === 'string' ? body.editCoverUrl.slice(0, 2048) : null;

    if (!targetName || targetName.length > 80) {
      return NextResponse.json({ error: 'Name must be between 1 and 80 characters' }, { status: 400 });
    }

    const { error } = await auth.client.from('profiles').update({
      username: targetName.replace(/ ☑️/g, '').replace(/ 👻/g, '').trim(),
      bio,
      avatar_url: editAvatarUrl,
      cover_url: editCoverUrl,
      gender,
      bdsm_role: bdsmRole,
    }).eq('id', auth.user.id);

    if (error) {
      console.error('[updateProfile] profile update failed:', error.message);
      return NextResponse.json({ error: 'Unable to update profile' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[updateProfile] unexpected error:', error);
    return NextResponse.json({ error: 'Unable to update profile' }, { status: 500 });
  }
}
