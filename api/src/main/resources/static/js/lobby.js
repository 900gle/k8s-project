mount(null);

app.innerHTML = `<div class="hero"><span class="logo">5AMSUNG</span><p>게임장에 오신 것을 환영합니다</p></div>
    <div class="grid">${Object.values(games).map(g => `
    <a class="tile" href="${g.path}">
        <div class="icon">${g.icon}</div><div class="name">${g.name}</div><div class="desc">${g.desc}</div>
    </a>`).join('')}</div>
    <p class="lobby-note">가상 포인트로만 즐기는 게임입니다.</p>`;
