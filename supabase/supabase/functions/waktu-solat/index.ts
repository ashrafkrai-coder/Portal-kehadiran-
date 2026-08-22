const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

declare const Deno: {
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const to12 = (value: unknown) => {
  if (!value) return value;
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return value;
  let hour = Number(match[1]);
  const minute = match[2];
  const period = (match[4] || '').toLowerCase();
  if (period === 'pm' && hour < 12) hour += 12;
  if (period === 'am' && hour === 12) hour = 0;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = String(((hour + 11) % 12) + 1).padStart(2, '0');
  return `${displayHour}:${minute} ${suffix}`;
};

const convertPrayerTimes = (payload: any) => {
  const timeKeys = ['fajr', 'syuruk', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const convertRow = (row: any) => {
    if (!row || typeof row !== 'object') return row;
    const next = { ...row };
    for (const key of timeKeys) {
      if (key in next) next[key] = to12(next[key]);
    }
    return next;
  };

  if (Array.isArray(payload?.data)) {
    payload.data = payload.data.map(convertRow);
  }
  if (Array.isArray(payload?.prayerTime)) {
    payload.prayerTime = payload.prayerTime.map(convertRow);
  }
  return payload;
};

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const zon = url.searchParams.get('zon') || 'SGR01';
  try {
    const r = await fetch(`https://api.e-solat.gov.my/index.php?r=clim/prayerTimes&zone=${zon}`);
    const j = convertPrayerTimes(await r.json());
    return new Response(JSON.stringify(j), { headers: cors });
  } catch {
    return new Response(JSON.stringify({ error: 'gagal' }), { status: 500, headers: cors });
  }
});
