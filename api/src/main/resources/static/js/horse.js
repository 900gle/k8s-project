mount('horse');

const N = 5;
panel('horse', `
    <div class="row" id="picks">${Array.from({length: N}, (_, i) =>
        `<button class="ghost" data-i="${i}">${i + 1}번 말</button>`).join('')}</div>
    <div class="row">${betHtml}<button id="go" disabled>출발!</button></div>
    <div id="tracks">${Array.from({length: N}, (_, i) =>
        `<div class="track"><span class="horse">🐎</span><span class="lane">${i + 1}</span><span class="finish"></span></div>`).join('')}</div>
    <div class="result" id="res">말을 선택하고 베팅하세요.</div>`);
let pick = null, running = false;
const res = $('#res'), go = $('#go');
$('#picks').onclick = e => {
    const b = e.target.closest('button'); if (!b || running) return;
    pick = Number(b.dataset.i);
    document.querySelectorAll('#picks button').forEach(x => x.classList.toggle('sel', x === b));
    go.disabled = false;
};
go.onclick = async () => {
    const bet = getBet(res); if (bet === null) return;
    running = true; go.disabled = true;
    const horses = document.querySelectorAll('.horse');
    const width = $('#tracks').clientWidth - 70;
    const pos = Array(N).fill(0);
    let winner = -1;
    while (winner < 0) {
        for (let i = 0; i < N; i++) {
            pos[i] += Math.random() * 14;
            horses[i].style.left = Math.min(pos[i], width) + 'px';
            if (pos[i] >= width && winner < 0) winner = i;
        }
        await sleep(100);
    }
    // 동시 도착 시 가장 앞선 말
    winner = pos.indexOf(Math.max(...pos));
    const win = winner === pick;
    settle(res, win, win ? bet * 2 : bet, `${winner + 1}번 말 우승!`);
    running = false; go.disabled = false;
    horses.forEach(h => h.style.left = '0px');
};
