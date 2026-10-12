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
| [`api`](api) | Spring Boot 4.0.6 / `spring-boot-starter-webmvc`, `actuator`. `Dockerfile`로 이미지(`api:1.0`) 빌드 |
| [`k8s`](k8s) | k3d 클러스터(`local-k8s`)와 `base/` 매니페스트 (Namespace, ConfigMap, Secret, Deployment, Service, Ingress) |

## 사전 준비

- JDK 21
- Docker (메모리 4GB 이상 할당 권장)
- [k3d](https://k3d.io), `kubectl`

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

## 로컬 실행 (클러스터 없이)

```bash
cd api
./gradlew bootRun
```

## 정리

```bash
k3d cluster delete local-k8s
```
