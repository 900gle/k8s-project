-- 회원
CREATE TABLE IF NOT EXISTS users (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(30)  NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,           -- BCrypt
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 로그인 세션 (Pod가 여러 개라 DB에 보관). 쿠키 값의 SHA-256 해시만 저장
CREATE TABLE IF NOT EXISTS user_session (
    token_hash CHAR(64)   PRIMARY KEY,
    user_id    BIGINT     NOT NULL,
    expires_at TIMESTAMP  NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 사용자별 포인트
CREATE TABLE IF NOT EXISTS wallet (
    user_id BIGINT PRIMARY KEY,
    points  INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 사용자별, 게임별 누적 전적
CREATE TABLE IF NOT EXISTS game_stat (
    user_id BIGINT      NOT NULL,
    game    VARCHAR(20) NOT NULL,                  -- horse / ladder / oddeven / rps
    wins    INT NOT NULL DEFAULT 0,
    losses  INT NOT NULL DEFAULT 0,
    draws   INT NOT NULL DEFAULT 0,
    net     INT NOT NULL DEFAULT 0,                -- 누적 손익(P)
    PRIMARY KEY (user_id, game),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 판마다 쌓는 게임 이력
CREATE TABLE IF NOT EXISTS game_log (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT      NOT NULL,
    game       VARCHAR(20) NOT NULL,
    outcome    CHAR(1)     NOT NULL,               -- w(승) / l(패) / d(무)
    delta      INT         NOT NULL,               -- 포인트 변동
    created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
