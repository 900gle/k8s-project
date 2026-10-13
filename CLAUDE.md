# CLAUDE.md

Spring Boot API(5AMSUNG 게임장)를 로컬 k3d 클러스터(`local-k8s`)에 배포하는 프로젝트. 자세한 내용은 [README.md](README.md), [k8s/README.md](k8s/README.md) 참고.

## 구조

- `api/` — Spring Boot 4.0.6, Java 21, Gradle. 정적 화면은 `src/main/resources/static/`, 스키마는 `schema.sql` (앱 시작 시 자동 실행)
- `k8s/` — `k3d-cluster.yaml`, `base/` 매니페스트 (namespace `app`, deployment/service `api`)
- `deploy.sh` — 빌드 → 이미지 → import → apply → 재시작

## 자주 쓰는 명령

```bash
./deploy.sh                                  # 배포 (코드 변경 없으면 빌드/import 건너뜀)
cd api && ./gradlew bootRun                  # 클러스터 없이 로컬 실행
kubectl -n app get pods
kubectl -n app logs deploy/api
k3d cluster start local-k8s                  # 클러스터 시작
```

## 알아둘 점

- 이미지는 항상 `api:1.0`, `imagePullPolicy: Never`. 레지스트리가 아니라 `k3d image import`로 노드에 넣는다.
- DB는 클러스터 밖 호스트의 MySQL 컨테이너(`mysql`, 3306). Pod는 `host.k3d.internal:3306`으로 접속한다. 클러스터 재시작 직후에는 CoreDNS가 늦어 `UnknownHostException`으로 Pod가 몇 번 재시작될 수 있으며 기다리면 정상화된다.
- `deploy.sh`는 `api/` 소스 해시를 이미지 라벨 `src.hash`에 저장해 변경 여부를 판단하고, 새로 빌드하면 이전 이미지를 삭제한다. 이 로직을 건드릴 때 라벨 이름을 유지할 것.
- Docker 디스크가 85% 이상 차면 `k3d image import`가 `containerd.sock: connection refused` / `input/output error`로 실패한다. 해결 순서는 README의 트러블슈팅 참고.
- `docker volume prune`은 MySQL 데이터 볼륨을 지울 수 있으니 사용자 확인 없이 실행하지 않는다.
- `k8s/base/02-secret.yaml` 값은 로컬 테스트용이다. 실제 자격 증명은 커밋하지 않는다.
- 기본 브랜치는 `main`.
