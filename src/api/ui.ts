/** Inline HTML dashboard served at /ui for UI + visual tests.
 *  Test contracts preserved: title "QA Quality Platform", heading, data-testid
 *  health-indicator (→ "ok"), pet-row, app-header, Refresh button, /health + /pets. */
export const UI_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>QA Quality Platform — Dashboard</title>
    <style>
      :root{
        --bg:#0b1020; --bg2:#121a2e; --card:#161f38; --card2:#1c2742;
        --bd:#243054; --fg:#e6edf3; --fg2:#94a3b8; --fg3:#64748b;
        --ac:#38bdf8; --ac2:#6366f1; --ok:#22c55e; --wn:#f59e0b; --er:#ef4444;
      }
      *{box-sizing:border-box;margin:0;padding:0}
      html,body{height:100%}
      body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--bg);color:var(--fg);line-height:1.5;font-size:14px}
      ::-webkit-scrollbar{width:8px;height:8px}
      ::-webkit-scrollbar-thumb{background:var(--bd);border-radius:4px}

      header[data-testid="app-header"]{
        padding:14px 24px;background:linear-gradient(90deg,#0ea5e9,#6366f1);
        display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;
        box-shadow:0 4px 24px rgba(14,165,233,.25);position:sticky;top:0;z-index:10;
      }
      header .brand{display:flex;align-items:center;gap:10px}
      header .logo{width:30px;height:30px;border-radius:8px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff}
      header h1{font-size:18px;color:#fff;letter-spacing:.2px;font-weight:700}
      header .badge{
        background:rgba(255,255,255,.15);padding:6px 14px;border-radius:999px;
        font-size:12px;color:#fff;font-weight:600;border:1px solid rgba(255,255,255,.25);
        display:flex;align-items:center;gap:6px;
      }
      header .badge::before{content:"";width:8px;height:8px;border-radius:50%;background:#fff;animation:pulse 1.6s infinite}
      header .badge.ok::before{background:#22c55e}
      header .badge.down::before{background:#ef4444}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}

      main{max-width:1100px;margin:0 auto;padding:24px}
      .layers{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px}
      .layer{
        background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:12px;
        display:flex;flex-direction:column;gap:4px;transition:transform .15s,border-color .15s;
      }
      .layer:hover{transform:translateY(-2px);border-color:var(--ac)}
      .layer .ic{font-size:18px}
      .layer .t{font-size:12px;font-weight:600;color:var(--fg)}
      .layer .s{font-size:10px;color:var(--fg3);text-transform:uppercase;letter-spacing:.5px}

      .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
      .card{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:18px;position:relative;overflow:hidden}
      .card::before{content:"";position:absolute;left:0;top:0;width:3px;height:100%;background:var(--ac)}
      .card.ok::before{background:var(--ok)} .card.wn::before{background:var(--wn)} .card.er::before{background:var(--er)}
      .card .label{font-size:11px;text-transform:uppercase;color:var(--fg2);letter-spacing:.6px}
      .card .value{font-size:28px;font-weight:800;margin-top:6px;font-variant-numeric:tabular-nums}
      .card .value.ok{color:var(--ok)} .card .value.wn{color:var(--wn)} .card .value.er{color:var(--er)}
      .card .hint{font-size:11px;color:var(--fg3);margin-top:2px}

      .panel{background:var(--card);border:1px solid var(--bd);border-radius:12px;overflow:hidden}
      .toolbar{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--bd);gap:12px;flex-wrap:wrap}
      .toolbar h2{font-size:15px;font-weight:700}
      .toolbar .tools{display:flex;gap:8px;align-items:center}
      .search{background:var(--bg2);border:1px solid var(--bd);border-radius:8px;padding:7px 12px;color:var(--fg);font-size:13px;outline:none;width:200px}
      .search:focus{border-color:var(--ac)}
      button#refresh{
        background:linear-gradient(90deg,var(--ac),var(--ac2));color:#fff;border:none;
        padding:8px 16px;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px;
        transition:filter .15s;display:flex;align-items:center;gap:6px;
      }
      button#refresh:hover{filter:brightness(1.12)}
      table{width:100%;border-collapse:collapse}
      th,td{text-align:left;padding:11px 18px;border-bottom:1px solid var(--bd);font-size:13px}
      th{background:var(--bg2);color:var(--fg2);text-transform:uppercase;font-size:10px;letter-spacing:.6px;font-weight:600}
      tbody tr{transition:background .1s}
      tbody tr:hover{background:rgba(56,189,248,.05)}
      .status{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700}
      .status.available{background:rgba(34,197,94,.15);color:#4ade80}
      .status.pending{background:rgba(245,158,11,.15);color:#fbbf24}
      .status.sold{background:rgba(239,68,68,.15);color:#f87171}
      .skel{background:linear-gradient(90deg,var(--bg2),var(--bd),var(--bg2));background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:4px;height:14px}
      @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      .empty{padding:40px;text-align:center;color:var(--fg3)}

      footer{text-align:center;padding:24px;color:var(--fg3);font-size:12px;border-top:1px solid var(--bd);margin-top:24px}
      footer a{color:var(--ac)}
      @media(max-width:720px){.layers,.cards{grid-template-columns:repeat(2,1fr)}.search{width:140px}}
    </style>
  </head>
  <body>
    <header data-testid="app-header">
      <div class="brand">
        <div class="logo">Q</div>
        <h1>QA Quality Platform</h1>
      </div>
      <span class="badge" data-testid="health-indicator">checking…</span>
    </header>

    <main>
      <div class="layers">
        <div class="layer"><span class="ic">🧠</span><span class="t">AI Test Gen</span><span class="s">OpenAPI → specs</span></div>
        <div class="layer"><span class="ic">🌐</span><span class="t">UI Testing</span><span class="s">Playwright</span></div>
        <div class="layer"><span class="ic">🔌</span><span class="t">API Testing</span><span class="s">request</span></div>
        <div class="layer"><span class="ic">📜</span><span class="t">Contract</span><span class="s">Ajv + OpenAPI</span></div>
        <div class="layer"><span class="ic">👁</span><span class="t">Visual</span><span class="s">screenshots</span></div>
        <div class="layer"><span class="ic">⚡</span><span class="t">Performance</span><span class="s">k6</span></div>
        <div class="layer"><span class="ic">🔒</span><span class="t">Security</span><span class="s">OWASP ZAP</span></div>
        <div class="layer"><span class="ic">📊</span><span class="t">Observability</span><span class="s">Prometheus</span></div>
      </div>

      <div class="cards">
        <div class="card"><div class="label">Total Pets</div><div class="value" id="total" data-testid="total-pets">—</div><div class="hint">in catalog</div></div>
        <div class="card ok"><div class="label">Available</div><div class="value ok" id="available" data-testid="available-pets">—</div><div class="hint">ready to adopt</div></div>
        <div class="card wn"><div class="label">Pending</div><div class="value wn" id="pending">—</div><div class="hint">in process</div></div>
        <div class="card er"><div class="label">Sold</div><div class="value er" id="sold">—</div><div class="hint">adopted</div></div>
      </div>

      <div class="panel">
        <div class="toolbar">
          <h2>Pet Inventory <span style="font-size:11px;color:var(--fg3);font-weight:400">· sample app under test</span></h2>
          <div class="tools">
            <input class="search" id="search" type="search" placeholder="Filter by name or tag…" />
            <button id="refresh" type="button">↻ Refresh</button>
          </div>
        </div>
        <table>
          <thead><tr><th>ID</th><th>Name</th><th>Tag</th><th>Status</th></tr></thead>
          <tbody id="rows" data-testid="pet-rows"></tbody>
        </table>
      </div>
    </main>

    <footer>AI-Powered QA Quality Platform · <a href="https://github.com/Vaskoor/ai-qa-quality-platform">GitHub</a> · demo dashboard</footer>

    <script>
      let ALL_PETS = [];
      function setStatus(cls, text){
        const el = document.querySelector('[data-testid="health-indicator"]');
        el.textContent = text; el.className = 'badge ' + cls;
      }
      async function loadHealth(){
        try{
          const r = await fetch('/health'); const b = await r.json();
          setStatus(b.status === 'ok' ? 'ok' : 'down', b.status || 'down');
        }catch{ setStatus('down','down'); }
      }
      function escapeHtml(s){ return String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
      function renderRows(pets){
        const tbody = document.getElementById('rows');
        tbody.innerHTML = '';
        if(pets.length === 0){ tbody.innerHTML = '<tr><td colspan="4"><div class="empty">No pets match.</div></td></tr>'; return; }
        for(const p of pets){
          const tr = document.createElement('tr');
          tr.setAttribute('data-testid','pet-row');
          tr.innerHTML =
            '<td style="font-family:monospace;color:var(--fg2)">#' + p.id + '</td>' +
            '<td style="font-weight:600">' + escapeHtml(p.name) + '</td>' +
            '<td style="color:var(--fg2)">' + escapeHtml(p.tag || '—') + '</td>' +
            '<td><span class="status ' + (p.status||'') + '">' + (p.status||'—') + '</span></td>';
          tbody.appendChild(tr);
        }
      }
      function updateStats(pets){
        document.getElementById('total').textContent = String(pets.length);
        document.getElementById('available').textContent = String(pets.filter(p=>p.status==='available').length);
        document.getElementById('pending').textContent = String(pets.filter(p=>p.status==='pending').length);
        document.getElementById('sold').textContent = String(pets.filter(p=>p.status==='sold').length);
      }
      async function loadPets(){
        const tbody = document.getElementById('rows');
        tbody.innerHTML = '<tr><td colspan="4"><div class="skel" style="margin:8px 18px"></div></td></tr><tr><td colspan="4"><div class="skel" style="margin:8px 18px"></div></td></tr>';
        try{
          const r = await fetch('/pets'); ALL_PETS = await r.json();
          applyFilter();
        }catch{ tbody.innerHTML = '<tr><td colspan="4"><div class="empty">Failed to load pets.</div></td></tr>'; }
      }
      function applyFilter(){
        const q = (document.getElementById('search').value||'').toLowerCase();
        const filtered = ALL_PETS.filter(p => (p.name||'').toLowerCase().includes(q) || (p.tag||'').toLowerCase().includes(q));
        renderRows(filtered); updateStats(ALL_PETS);
      }
      document.getElementById('refresh').addEventListener('click', loadPets);
      document.getElementById('search').addEventListener('input', applyFilter);
      loadHealth(); loadPets();
    </script>
  </body>
</html>`;
