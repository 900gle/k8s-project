CREATE TABLE IF NOT EXISTS wallet (
    id     INT PRIMARY KEY,
    points INT NOT NULL
);

INSERT IGNORE INTO wallet (id, points) VALUES (1, 1000);

CREATE TABLE IF NOT EXISTS game_stat (
    game   VARCHAR(20) PRIMARY KEY,
    wins   INT NOT NULL DEFAULT 0,
    losses INT NOT NULL DEFAULT 0,
    draws  INT NOT NULL DEFAULT 0,
    net    INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS game_log (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    game       VARCHAR(20) NOT NULL,
    outcome    CHAR(1)     NOT NULL,
    delta      INT         NOT NULL,
    created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);
