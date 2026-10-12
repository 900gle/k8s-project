# k8s-project

Spring Boot API를 로컬 Kubernetes(k3d) 클러스터에 배포해 보는 프로젝트입니다.

## 구성

```
k8s-project/
├── api/   # Spring Boot 애플리케이션 (Java 21, Gradle, Actuator)
└── k8s/   # k3d 클러스터 설정 및 Kubernetes 매니페스트
```

| 디렉터리 | 설명 |
| --- | --- |
| [`api`](api) | Spring Boot 4.0.6 / `webmvc`, `jdbc`, `actuator`, MySQL. `Dockerfile`로 이미지(`api:1.0`) 빌드 |
| [`k8s`](k8s) | k3d 클러스터(`local-k8s`)와 `base/` 매니페스트 (Namespace, ConfigMap, Secret, Deployment, Service, Ingress) |

## 사전 준비

- JDK 21
- Docker (메모리 4GB 이상 할당 권장)
- [k3d](https://k3d.io), `kubectl`
- MySQL 8 컨테이너 (호스트 3306 포트, 아래 [DB](#db-mysql) 참고)

## 빠른 시작

```bash
# 1. 클러스터 생성
cd k8s
k3d cluster create --config k3d-cluster.yaml

# 2. 이미지 빌드 후 클러스터로 import
cd ../api
./gradlew clean bootJar
docker build -t api:1.0 .
k3d image import api:1.0 -c local-k8s

# 3. 배포
cd ../k8s
kubectl apply -f base/

# 4. 확인 (호스트 8080 → NodePort 30080)
kubectl -n app rollout status deployment/api
curl http://localhost:8080/actuator/health
```

단계별 설명, 재배포 방법, 트러블슈팅은 [`k8s/README.md`](k8s/README.md)를 참고하세요.

## 한 번에 배포 (`deploy.sh`)

코드 변경 후 빌드부터 재시작까지 한 번에 수행하는 스크립트입니다. 클러스터가 켜져 있어야 합니다 (`k3d cluster start local-k8s`).

```bash
./deploy.sh
```

| 순서 | 동작 |
| --- | --- |
| 1 | kubectl context를 `k3d-local-k8s`로 전환 |
| 2 | `./gradlew clean bootJar` 로 api 빌드 |
| 3 | `docker build -t api:1.0` 로 이미지 빌드 |
| 4 | `k3d image import` 로 이미지를 클러스터에 import |
| 5 | `kubectl apply -f k8s/base/` 로 매니페스트 적용 |
| 6 | `rollout restart` 후 `rollout status` 로 완료 대기 |
| 7 | Pod 목록 출력 |

단계 하나라도 실패하면 즉시 중단됩니다.

## 게임장 (5AMSUNG)

루트(`/`)는 경마, 사다리타기, 홀짝, 가위바위보를 고를 수 있는 게임장 화면입니다. 가상 포인트로만 즐기며, 포인트와 게임별 누적 전적은 MySQL에 저장됩니다.

| 경로 | 게임 | 배당 |
| --- | --- | --- |
| `/horse` | 경마 | 맞히면 +2배 |
| `/ladder` | 사다리타기 | 맞히면 +2배 |
| `/oddeven` | 홀짝 | 1배 |
| `/rps` | 가위바위보 | 1배 (무승부는 변동 없음) |

화면 파일은 `api/src/main/resources/static/` 아래에 있습니다.

```
index.html                  # 로비
games/*.html                # 게임별 페이지 (GameController가 /horse 등으로 forward)
css/style.css               # 공통 스타일
js/common.js                # 포인트/전적, 상단 헤더, 베팅 처리, API 호출
js/{lobby,horse,ladder,oddeven,rps}.js
```

게임 판정은 브라우저에서 하고, 서버는 결과를 검증해 DB에 저장합니다.

## DB (MySQL)

포인트와 전적을 저장하기 위해 MySQL을 사용합니다. 사용자 구분 없이 지갑이 하나(`id = 1`)이며, 접속한 모두가 같은 포인트를 공유합니다.

### DB / 계정 준비 (최초 1회)

MySQL 컨테이너에 관리자 계정으로 접속해 DB와 전용 계정을 만듭니다.

```bash
docker exec -it mysql mysql -uroot -p
```

```sql
CREATE DATABASE game DEFAULT CHARACTER SET utf8mb4;
CREATE USER 'game'@'%' IDENTIFIED BY 'game-local-pw';
GRANT ALL PRIVILEGES ON game.* TO 'game'@'%';
```

### 테이블 스키마

앱이 시작될 때 `api/src/main/resources/schema.sql`이 자동으로 실행되며(`spring.sql.init.mode=always`), 이미 있으면 건너뜁니다. 직접 만들려면 아래 SQL을 실행하세요.

```sql
-- 포인트 (단일 지갑, id = 1)
CREATE TABLE IF NOT EXISTS wallet (
    id     INT PRIMARY KEY,
    points INT NOT NULL
);

INSERT IGNORE INTO wallet (id, points) VALUES (1, 1000);

-- 게임별 누적 전적
CREATE TABLE IF NOT EXISTS game_stat (
    game   VARCHAR(20) PRIMARY KEY,   -- horse / ladder / oddeven / rps
    wins   INT NOT NULL DEFAULT 0,
    losses INT NOT NULL DEFAULT 0,
    draws  INT NOT NULL DEFAULT 0,
    net    INT NOT NULL DEFAULT 0     -- 누적 손익(P)
);

-- 판마다 쌓는 게임 이력
CREATE TABLE IF NOT EXISTS game_log (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    game       VARCHAR(20) NOT NULL,
    outcome    CHAR(1)     NOT NULL,  -- w(승) / l(패) / d(무)
    delta      INT         NOT NULL,  -- 포인트 변동
    created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 접속 설정

`application.yml`은 환경변수 `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`를 읽고, 없으면 로컬 기본값(`localhost:3306/game`, `game` / `game-local-pw`)을 씁니다.

| 실행 환경 | 설정 위치 |
| --- | --- |
| 로컬 (`./gradlew bootRun`) | 기본값 사용. 필요하면 환경변수로 덮어쓰기 |
| k8s | `k8s/base/01-configmap.yaml`의 `DB_URL` (`host.k3d.internal:3306` → 호스트의 MySQL), `k8s/base/02-secret.yaml`의 `DB_USERNAME`, `DB_PASSWORD` |

> `02-secret.yaml`의 값은 로컬 테스트용입니다. 실제 자격 증명은 커밋하지 마세요.

### API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/state` | 포인트와 게임별 전적 조회 |
| POST | `/api/result` | 게임 결과 저장 `{"game":"horse","outcome":"w","delta":200}` |
| POST | `/api/reset` | 포인트 1000, 전적 초기화 (`game_log`는 유지) |

`/api/result`는 없는 게임, 결과와 맞지 않는 변동값, 보유 포인트를 넘는 손실이면 400을 반환합니다.

## 로컬 실행 (클러스터 없이)

```bash
cd api
./gradlew bootRun
```

## 정리

```bash
k3d cluster delete local-k8s
```
