mount('oddeven');

panel('oddeven', `
    <div class="big" id="dice">🎲 🎲</div>
    <div class="row" style="justify-content:center">
        <button class="ghost" data-c="odd">홀</button>
        <button class="ghost" data-c="even">짝</button>
    </div>
    <div class="row" style="justify-content:center">${betHtml}</div>
    <div class="result" id="res" style="text-align:center">홀 또는 짝을 선택하면 바로 굴립니다.</div>`);
const res = $('#res'), dice = $('#dice');
const faces = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
document.querySelectorAll('[data-c]').forEach(b => b.onclick = async () => {
    const bet = getBet(res); if (bet === null) return;
    document.querySelectorAll('[data-c]').forEach(x => x.disabled = true);
    for (let i = 0; i < 8; i++) { dice.textContent = `${faces[1 + rnd(6)]} ${faces[1 + rnd(6)]}`; await sleep(90); }
    const a = 1 + rnd(6), c = 1 + rnd(6), sum = a + c;
    dice.textContent = `${faces[a]} ${faces[c]}`;
    const result = sum % 2 ? 'odd' : 'even';
    settle(res, result === b.dataset.c, bet, `합 ${sum} → ${sum % 2 ? '홀' : '짝'}.`);
    document.querySelectorAll('[data-c]').forEach(x => x.disabled = false);
});
