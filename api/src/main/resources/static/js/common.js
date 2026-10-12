// 게임장 공통: 포인트, 게임별 누적 전적, 상단 레이아웃, 베팅 처리
const START = 1000;
const games = {
    horse:   { icon: '🏇', name: '경마',       desc: '말을 골라 1등 맞히기 (x3)', path: '/horse' },
    ladder:  { icon: '🪜', name: '사다리타기', desc: '도착 지점 맞히기 (x3)',     path: '/ladder' },
    oddeven: { icon: '🎲', name: '홀짝',       desc: '주사위 합이 홀? 짝? (x1)',  path: '/oddeven' },
    rps:     { icon: '✌️', name: '가위바위보', desc: '컴퓨터를 이겨라 (x1)',      path: '/rps' },
};

const $ = (s, r = document) => r.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = n => Math.floor(Math.random() * n);

let current = null;   // 현재 게임 키 (로비는 null)
let app = null;       // <main id="app">

let points = START;
let stats = {};       // 게임별 누적 전적: { horse: {w, l, d, net}, ... }

function setPoints(v) {
    points = v;
    $('#pts').textContent = v;
}

// 서버(DB)가 돌려준 상태로 화면을 맞춘다.
function applyState(st) {
    stats = st.stats;
    setPoints(st.points);
    renderScore();
}

async function api(path, body) {
    const res = await fetch('/api' + path, body === undefined ? {} : {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
    });
    if (res.status === 401) { location.href = '/login'; throw new Error('unauthorized'); }
    if (!res.ok) throw new Error(path + ' ' + res.status);
    return res.json();
}

// 결과를 DB에 저장하고, 서버가 계산한 포인트/전적으로 화면을 갱신한다.
// 화면은 먼저 낙관적으로 갱신해서 반응이 즉시 보이게 한다.
function record(game, outcome, delta) {
    const s = stats[game] || (stats[game] = {w: 0, l: 0, d: 0, net: 0});
    s[outcome]++;
    s.net += delta;
    renderScore();
    return api('/result', {game, outcome, delta}).then(applyState).catch(e => {
        console.error(e);
        api('/state').then(applyState).catch(() => {});
    });
}

function renderScore() {
    $('#score').innerHTML = Object.entries(games).map(([k, g]) => {
        const s = stats[k] || {w: 0, l: 0, d: 0, net: 0};
        const cls = s.net > 0 ? 'win' : s.net < 0 ? 'lose' : '';
        return `<a class="item ${k === current ? 'cur' : ''}" href="${g.path}" style="color:inherit;text-decoration:none">${g.icon} ${g.name} ` +
            `${s.w}승 ${s.l}패${k === 'rps' ? ` ${s.d}무` : ''} ` +
            `<span class="net ${cls}">${s.net > 0 ? '+' : ''}${s.net}P</span></a>`;
    }).join('');
}

// 헤더 + 점수판 + <main id="app"> 를 페이지에 붙인다. 각 페이지 스크립트가 맨 처음 호출.
function mount(key) {
    current = key;
    document.body.insertAdjacentHTML('afterbegin', `
        <header>
            <h1 id="home" title="5AMSUNG"><span class="logo">5AMSUNG</span></h1>
            <div class="points"><span class="user" id="user"></span>포인트 <span id="pts">${points}</span>
                <button class="ghost" id="reset">초기화</button>
                <button class="ghost" id="logout">로그아웃</button>
            </div>
        </header>
        <section class="score" id="score"></section>
        <main id="app"></main>`);
    app = $('#app');
    $('#home').onclick = () => { location.href = '/'; };
    $('#reset').onclick = () => api('/reset', {}).then(applyState).catch(console.error);
    $('#logout').onclick = () => fetch('/api/auth/logout', {method: 'POST'}).finally(() => { location.href = '/login'; });
    renderScore();
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(me => { if (me) $('#user').textContent = me.username + ' 님'; }).catch(() => {});
    api('/state').then(applyState).catch(console.error);
}

// 베팅 UI: 금액 입력 + 검증. 유효하면 금액, 아니면 null
const betHtml = `<label>베팅 <input type="number" id="bet" min="10" step="10" value="100"> P</label>`;
function getBet(resultEl) {
    const b = Number($('#bet').value);
    if (!Number.isInteger(b) || b < 10) { resultEl.textContent = '베팅은 10P 이상 정수로 입력하세요.'; resultEl.className = 'result lose'; return null; }
    if (b > points) { resultEl.textContent = '포인트가 부족합니다.'; resultEl.className = 'result lose'; return null; }
    return b;
}

function settle(resultEl, win, bet, msg) {
    setPoints(points + (win ? bet : -bet));
    record(current, win ? 'w' : 'l', win ? bet : -bet);
    resultEl.className = 'result ' + (win ? 'win' : 'lose');
    resultEl.textContent = `${msg} ${win ? '+' : '-'}${bet}P`;
}

// 게임 화면 틀 (뒤로가기 + 제목)
function panel(name, body) {
    const g = games[name];
    app.innerHTML = `<button class="ghost back" id="toLobby">← 게임장</button>
        <div class="panel"><h2>${g.icon} ${g.name}</h2>${body}</div>`;
    $('#toLobby').onclick = () => { location.href = '/'; };
}
