// Fake condors for trying the multiplayer UI with company. Each bot is a real pilot: it fetches
// the landing for a CSRF token, opens a session (POST /flock/session) for its cookie, connects
// to Action Cable with it and flies, sending `move` at 10 Hz. Some circle the Santiago spawn,
// the rest cruise anywhere over the country.
//
//   node --experimental-strip-types scripts/flock-bots.ts [count=12] [near=6] [origin=http://localhost:3000]
//
// Ctrl-C disconnects them all; the server drops what it does not hear from within 8 s anyway.

const COUNT = Number(process.argv[2] ?? 12)
const NEAR = Number(process.argv[3] ?? Math.min(6, COUNT))
const ORIGIN = process.argv[4] ?? `http://localhost:${process.env.PORT ?? 3000}`
const UPK = 20 // units per km (scene.ts DEFAULTS.unitsPerKm)
const SANTIAGO = { x: 12 * UPK, z: 1785 * UPK } // the spawn: 12 km east of the centreline, over Santiago
const LENGTH_KM = 68 * 256 * 0.25 // tilesY × tile × kmPerSample of the current dataset

type Bot = { i: number; x: number; y: number; z: number; yaw: number; speed: number; turn: number; ws: WebSocket; codename: string }

const rnd = (a: number, b: number) => a + Math.random() * (b - a)

async function session(): Promise<{ cookie: string; pilot: { id: number; codename: string } }> {
  const page = await fetch(ORIGIN, { redirect: 'manual' })
  const html = await page.text()
  const token = html.match(/name="csrf-token" content="([^"]+)"/)?.[1] ?? ''
  const jar = new Map<string, string>()
  const take = (res: Response) => {
    for (const c of res.headers.getSetCookie()) {
      const [kv] = c.split(';')
      const [k, ...v] = kv.split('=')
      jar.set(k.trim(), v.join('='))
    }
  }
  take(page)
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ')
  const res = await fetch(`${ORIGIN}/flock/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-Token': token, Cookie: cookie() },
  })
  if (!res.ok) throw new Error(`session: ${res.status} ${await res.text()}`)
  take(res)
  return { cookie: cookie(), pilot: (await res.json()) as { id: number; codename: string } }
}

async function spawn(i: number): Promise<Bot> {
  const { cookie, pilot } = await session()
  const near = i < NEAR
  const bot: Bot = {
    i,
    x: near ? SANTIAGO.x + rnd(-250, 250) : rnd(-2000, 2000),
    y: near ? rnd(120, 220) : rnd(200, 900),
    z: near ? SANTIAGO.z + rnd(-250, 250) : rnd(40, LENGTH_KM - 40) * UPK,
    yaw: rnd(-Math.PI, Math.PI),
    speed: near ? rnd(25, 45) : rnd(40, 80),
    turn: near ? rnd(-0.25, 0.25) : rnd(-0.05, 0.05),
    ws: new WebSocket(`${ORIGIN.replace(/^http/, 'ws')}/cable`, { headers: { Cookie: cookie, Origin: ORIGIN } } as never),
    codename: pilot.codename,
  }
  const identifier = JSON.stringify({ channel: 'FlockChannel', role: 'player' })
  bot.ws.addEventListener('open', () => bot.ws.send(JSON.stringify({ command: 'subscribe', identifier })))
  bot.ws.addEventListener('message', (e) => {
    const msg = JSON.parse(String(e.data))
    if (msg.type === 'reject_subscription') console.error(`bot ${i} (${pilot.codename}): rejected`)
    if (msg.type === 'confirm_subscription') console.log(`bot ${i}: ${pilot.codename} flying ${near ? 'over Santiago' : 'far away'}`)
  })
  bot.ws.addEventListener('close', () => console.log(`bot ${i}: closed`))
  const tick = 0.1
  setInterval(() => {
    if (bot.ws.readyState !== WebSocket.OPEN) return
    bot.yaw += bot.turn * tick
    if (Math.random() < 0.01) bot.turn = near ? rnd(-0.3, 0.3) : rnd(-0.05, 0.05)
    bot.x -= Math.sin(bot.yaw) * bot.speed * tick
    bot.z -= Math.cos(bot.yaw) * bot.speed * tick
    bot.y += Math.sin(bot.i) * 0.02
    // stay near the spawn (or inside the country): turn back toward it when drifting away
    if (near && Math.hypot(bot.x - SANTIAGO.x, bot.z - SANTIAGO.z) > 400) bot.yaw = Math.atan2(-(SANTIAGO.x - bot.x), -(SANTIAGO.z - bot.z))
    if (!near && (Math.abs(bot.x) > 2000 || bot.z < 40 * UPK || bot.z > (LENGTH_KM - 40) * UPK)) bot.yaw = Math.atan2(-(0 - bot.x), -(SANTIAGO.z - bot.z))
    const roll = Math.max(-0.6, Math.min(0.6, bot.turn * 2))
    const data = { x: bot.x, y: bot.y, z: bot.z, yaw: bot.yaw, pitch: 0, roll, s: bot.speed }
    bot.ws.send(JSON.stringify({ command: 'message', identifier, data: JSON.stringify({ action: 'move', ...data }) }))
  }, tick * 1000)
  return bot
}

const bots: Bot[] = []
for (let i = 0; i < COUNT; i++) {
  try {
    bots.push(await spawn(i))
  } catch (e) {
    console.error(`bot ${i}: ${(e as Error).message}`)
  }
}
console.log(`${bots.length} bots up at ${ORIGIN}; Ctrl-C to land them`)
process.on('SIGINT', () => {
  for (const b of bots) b.ws.close()
  setTimeout(() => process.exit(0), 200)
})
