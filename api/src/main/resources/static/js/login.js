// 로그인 / 회원가입 화면
let mode = 'login';
const $ = (s) => document.querySelector(s);

function setMode(m) {
    mode = m;
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('sel', b.dataset.mode === m));
    $('#confirm-row').hidden = m !== 'signup';
    $('#confirm').required = m === 'signup';
    $('#password').autocomplete = m === 'signup' ? 'new-password' : 'current-password';
    $('#submit').textContent = m === 'signup' ? '가입하고 시작' : '로그인';
    $('#hint').hidden = m !== 'signup';
    $('#msg').textContent = '';
}

document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => setMode(b.dataset.mode));

$('#form').onsubmit = async e => {
    e.preventDefault();
    const msg = $('#msg');
    const username = $('#username').value.trim();
    const password = $('#password').value;
    if (mode === 'signup' && password !== $('#confirm').value) {
        msg.className = 'result lose';
        msg.textContent = '비밀번호 확인이 일치하지 않습니다.';
        return;
    }
    $('#submit').disabled = true;
    try {
        const res = await fetch('/api/auth/' + mode, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username, password}),
        });
        if (res.ok) { location.href = '/'; return; }
        const body = await res.json().catch(() => ({}));
        msg.className = 'result lose';
        msg.textContent = body.message || (res.status === 401
            ? '아이디 또는 비밀번호가 올바르지 않습니다.' : '요청에 실패했습니다. (' + res.status + ')');
    } catch (err) {
        msg.className = 'result lose';
        msg.textContent = '서버에 연결할 수 없습니다.';
    } finally {
        $('#submit').disabled = false;
    }
};

// 이미 로그인되어 있으면 바로 게임장으로
fetch('/api/auth/me').then(r => { if (r.ok) location.href = '/'; }).catch(() => {});
setMode('login');
