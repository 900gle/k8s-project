mount('ladder');

const N = 4, ROWS = 10, W = 440, H = 300, PAD = 40;
panel('ladder', `
    <div class="row" id="picks">${Array.from({length: N}, (_, i) =>
        `<button class="ghost" data-i="${i}">${i + 1}번 출발</button>`).join('')}
        <span style="color:var(--muted)">→ 당첨 지점은 숨겨져 있습니다</span></div>
    <div class="row">${betHtml}<button id="go" disabled>타기!</button></div>
    <canvas id="ladder" width="${W}" height="${H}"></canvas>
    <div class="result" id="res">출발점을 선택하세요.</div>`);
const cv = $('#ladder'), ctx = cv.getContext('2d');
const res = $('#res'), go = $('#go');
const colX = i => PAD + i * ((W - PAD * 2) / (N - 1));
const rowY = r => 30 + r * ((H - 70) / (ROWS - 1));
let pick = null;

function makeBridges() {
    const br = [];
    for (let r = 0; r < ROWS; r++) {
        const used = new Set();
        for (let c = 0; c < N - 1; c++)
            if (!used.has(c - 1) && Math.random() < 0.45) { br.push([r, c]); used.add(c); }
    }
    return br;
}
function draw(br, path, labels) {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 3; ctx.strokeStyle = '#475569';
    for (let i = 0; i < N; i++) { ctx.beginPath(); ctx.moveTo(colX(i), 30); ctx.lineTo(colX(i), H - 40); ctx.stroke(); }
    br.forEach(([r, c]) => { ctx.beginPath(); ctx.moveTo(colX(c), rowY(r)); ctx.lineTo(colX(c + 1), rowY(r)); ctx.stroke(); });
    ctx.fillStyle = '#e2e8f0'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
    for (let i = 0; i < N; i++) {
        ctx.fillText(i + 1, colX(i), 18);
        if (labels) ctx.fillText(labels[i], colX(i), H - 18);
    }
    if (path) {
        ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 5; ctx.beginPath();
        path.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    }
}
draw([], null, null);
$('#picks').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    pick = Number(b.dataset.i);
    document.querySelectorAll('#picks button').forEach(x => x.classList.toggle('sel', x === b));
    go.disabled = false;
};
go.onclick = async () => {
    const bet = getBet(res); if (bet === null) return;
    go.disabled = true;
    const br = makeBridges();
    const prize = rnd(N); // 당첨 지점
    const labels = Array.from({length: N}, (_, i) => i === prize ? '🎯' : '꽝');
    let c = pick;
    const path = [[colX(c), 30]];
    for (let r = 0; r < ROWS; r++) {
        const y = rowY(r);
        const right = br.some(([rr, cc]) => rr === r && cc === c);
        const left = br.some(([rr, cc]) => rr === r && cc === c - 1);
        path.push([colX(c), y]);
        if (right) { c++; path.push([colX(c), y]); }
        else if (left) { c--; path.push([colX(c), y]); }
        draw(br, path, null);
        await sleep(160);
    }
    path.push([colX(c), H - 40]);
    draw(br, path, labels);
    const win = c === prize;
    settle(res, win, win ? bet * 2 : bet, win ? '당첨! 🎯' : '꽝!');
    go.disabled = false;
};
