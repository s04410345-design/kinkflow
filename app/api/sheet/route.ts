import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`Google Sheets responded with ${response.status}`);
    }
    const csvData = await response.text();
    return new NextResponse(csvData, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=120'
      }
    });
  } catch (error: unknown) {
    console.error("Sheet API 錯誤:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
