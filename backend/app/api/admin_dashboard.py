import secrets
from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import HTMLResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
from app.database import get_db
from app.config import settings

security = HTTPBasic()

router = APIRouter(tags=["admin-dashboard"])

HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ReelActions Admin</title>
<script src="https://cdn.tailwindcss.com"></script>
<script>tailwind.config = { darkMode: 'class' }</script>
</head>
<body class="dark bg-[#111] text-[#e2e2e2] min-h-screen p-4 font-sans">
  <div class="max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold mb-1">Reel<span class="text-[#22c55e]">Actions</span> Admin</h1>
    <p class="text-[#a0a0a0] text-sm mb-6">Events &amp; IP Management</p>

    <section class="mb-8">
      <h2 class="text-lg font-semibold mb-3">Blocked IPs</h2>
      <div id="blocked" class="space-y-2 text-sm"></div>
    </section>

    <section>
      <h2 class="text-lg font-semibold mb-3">Recent Events</h2>
      <div id="events" class="space-y-2 text-sm"></div>
    </section>
  </div>

<script>
async function api(path, method = 'GET', body = null) {
  const res = await fetch(path, {
    method,
    headers: {'Content-Type': 'application/json'},
    body: body ? JSON.stringify(body) : null,
  });
  return res.json();
}

function badge(type) {
  const colors = { rate_limit: 'bg-yellow-500', error: 'bg-red-500', job_failure: 'bg-red-600' };
  return `<span class="px-2 py-0.5 rounded text-xs font-bold text-black ${colors[type] || 'bg-gray-500'}">${type}</span>`;
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  return Math.floor(s/86400) + 'd ago';
}

async function blockIP(ip) {
  await api('/api/v1/admin/block-ip', 'POST', { ip });
  load();
}

async function unblockIP(ip) {
  await api('/api/v1/admin/unblock-ip', 'POST', { ip });
  load();
}

async function load() {
  const [events, blocked] = await Promise.all([
    api('/api/v1/admin/events'),
    api('/api/v1/admin/blocked-ips'),
  ]);

  document.getElementById('blocked').innerHTML = blocked.length
    ? blocked.map(b => `
        <div class="flex items-center justify-between bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg px-4 py-3">
          <span class="font-mono">${b.ip}</span>
          <button onclick="unblockIP('${b.ip}')" class="text-[#22c55e] text-xs font-semibold">Unblock</button>
        </div>`).join('')
    : '<p class="text-[#a0a0a0]">No blocked IPs</p>';

  document.getElementById('events').innerHTML = events.length
    ? events.map(e => `
        <div class="bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg px-4 py-3 space-y-1">
          <div class="flex items-center justify-between">
            ${badge(e.type)}
            <span class="text-[#a0a0a0] text-xs">${timeAgo(e.created_at)}</span>
          </div>
          <p class="text-[#e2e2e2] break-words">${e.message}</p>
          ${e.ip ? `<div class="flex items-center justify-between pt-1">
            <span class="font-mono text-xs text-[#a0a0a0]">${e.ip}</span>
            <button onclick="blockIP('${e.ip}')" class="text-red-400 text-xs font-semibold">Block IP</button>
          </div>` : ''}
        </div>`).join('')
    : '<p class="text-[#a0a0a0]">No events yet</p>';
}

load();
setInterval(load, 30000);
</script>
</body>
</html>
"""


def _check_auth(credentials: HTTPBasicCredentials = Depends(security)):
    ok = secrets.compare_digest(credentials.password.encode(), settings.admin_secret.encode())
    if not ok:
        raise HTTPException(status_code=401, detail="Unauthorized",
                            headers={"WWW-Authenticate": "Basic"})


class IPRequest(BaseModel):
    ip: str


@router.get("/admin/dashboard", response_class=HTMLResponse)
def dashboard(auth=Depends(_check_auth)):
    return HTML


@router.get("/admin/events")
def get_events(auth=Depends(_check_auth)):
    result = (
        get_db().table("admin_events")
        .select("*")
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return result.data


@router.get("/admin/blocked-ips")
def get_blocked_ips(auth=Depends(_check_auth)):
    return get_db().table("blocked_ips").select("*").order("blocked_at", desc=True).execute().data


@router.post("/admin/block-ip", status_code=204)
def block_ip(body: IPRequest, auth=Depends(_check_auth)):
    get_db().table("blocked_ips").upsert({"ip": body.ip}).execute()


@router.post("/admin/unblock-ip", status_code=204)
def unblock_ip(body: IPRequest, auth=Depends(_check_auth)):
    get_db().table("blocked_ips").delete().eq("ip", body.ip).execute()
