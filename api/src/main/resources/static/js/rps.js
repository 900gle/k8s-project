mount('rps');

const hands = ['✌️', '✊', '🖐️']; // 0 가위, 1 바위, 2 보
const names = ['가위', '바위', '보'];
panel('rps', `
    <div class="big" id="vs">❓ vs ❓</div>
    <div class="row" style="justify-content:center">${hands.map((h, i) =>
        `<button class="ghost" data-h="${i}">${h} ${names[i]}</button>`).join('')}</div>
    <div class="row" style="justify-content:center">${betHtml}</div>
    <div class="result" id="res" style="text-align:center">무승부는 포인트 변동이 없습니다.</div>`);
const res = $('#res');
document.querySelectorAll('[data-h]').forEach(b => b.onclick = async () => {
    const bet = getBet(res); if (bet === null) return;
    document.querySelectorAll('[data-h]').forEach(x => x.disabled = true);
    const me = Number(b.dataset.h);
    for (let i = 0; i < 6; i++) { $('#vs').textContent = `${hands[me]} vs ${hands[rnd(3)]}`; await sleep(100); }
    const cpu = rnd(3);
    $('#vs').textContent = `${hands[me]} vs ${hands[cpu]}`;
    const diff = (me - cpu + 3) % 3; // 0 무, 1 승, 2 패
    if (diff === 0) { res.className = 'result'; res.textContent = '비겼습니다.'; record('rps', 'd', 0); }
    else settle(res, diff === 1, bet, diff === 1 ? '이겼습니다!' : '졌습니다.');
    document.querySelectorAll('[data-h]').forEach(x => x.disabled = false);
});
