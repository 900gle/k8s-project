# k8s

`../api` Spring Boot 애플리케이션을 로컬 k3d 클러스터(`local-k8s`)에 배포하기 위한 매니페스트입니다.

## 구성

```
k8s/
├── k3d-cluster.yaml        # k3d 클러스터 설정 (server 1, agent 1, 호스트 8080 → NodePort 30080)
└── base/
    ├── 00-namespace.yaml   # Namespace: app
    ├── 01-configmap.yaml   # ConfigMap: api-config (SPRING_PROFILES_ACTIVE, SERVER_PORT)
    ├── 02-secret.yaml      # Secret: api-secret (API_KEY, DB_USERNAME, DB_PASSWORD)
    ├── 03-deployment.yaml  # Deployment: api (replicas 2, image api:1.0)
    ├── 04-service.yaml     # Service: api-service (NodePort 30080)
    └── 05-ingress.yaml     # Ingress: api.local (ingressClassName: nginx)
```

## 사전 준비

- Docker Desktop: **메모리 4GB 이상** 할당 (Settings → Resources)
- `k3d`, `kubectl` 설치
- JDK 21 (api 빌드용)

> 메모리가 부족하면 API 서버가 `TLS handshake timeout`으로 응답하지 못합니다.
> 다른 k3d 클러스터는 중지해 두는 것을 권장합니다: `k3d cluster stop <이름>`

## 사용 방법

### 1. 클러스터 생성 (최초 1회)

```bash
cd k8s
k3d cluster create --config k3d-cluster.yaml
```

이미 만들어져 있다면 시작만 합니다.

```bash
k3d cluster start local-k8s
```

### 2. kubectl context 확인

클러스터가 여러 개면 다른 클러스터를 가리키고 있을 수 있으므로 반드시 확인합니다.

```bash
kubectl config use-context k3d-local-k8s
kubectl get nodes        # 노드 2개가 Ready 인지 확인
```

### 3. api 이미지 빌드

```bash
cd ../api
./gradlew clean bootJar
docker build -t api:1.0 .
```

### 4. 이미지를 클러스터로 import

Deployment가 `imagePullPolicy: Never`이므로 레지스트리에서 받지 않고 클러스터 노드에 있는 이미지만 사용합니다.
로컬 Docker에 빌드한 이미지를 k3d 노드로 넣어줘야 합니다.

```bash
k3d image import api:1.0 -c local-k8s
```

> 이 단계를 빠뜨리면 Pod가 `ErrImageNeverPull` 상태가 됩니다.

### 5. 매니페스트 적용

파일명 순서(namespace → configmap/secret → deployment → service → ingress)대로 적용됩니다.

```bash
cd ../k8s
kubectl apply -f base/
```

### 6. 배포 상태 확인

```bash
kubectl -n app get all
kubectl -n app rollout status deployment/api
kubectl -n app logs -l app=api -f
```

### 7. 접속 확인

호스트 `8080` → loadbalancer → NodePort `30080` → `api-service` 로 연결됩니다.

```bash
curl http://localhost:8080/actuator/health
```

## 코드 변경 후 재배포

이미지 태그가 같으므로 import 후 재시작해야 새 이미지가 반영됩니다.

```bash
cd ../api
./gradlew clean bootJar
docker build -t api:1.0 .
k3d image import api:1.0 -c local-k8s
kubectl -n app rollout restart deployment/api
kubectl -n app rollout status deployment/api
```

## 정리

```bash
k3d cluster stop local-k8s      # 중지 (데이터 유지)
k3d cluster delete local-k8s    # 완전 삭제
```

## 참고

- **Ingress**: `05-ingress.yaml`은 `ingressClassName: nginx`를 사용하지만, k3d(k3s)에는 기본으로 Traefik만 설치되어 있습니다.
  ingress-nginx를 따로 설치하지 않으면 이 Ingress는 동작하지 않으며, 접속은 위의 NodePort(`localhost:8080`) 경로를 사용합니다.
- **Secret**: `02-secret.yaml`의 값은 로컬 테스트용입니다. 실제 자격 증명을 커밋하지 마세요.

## 트러블슈팅

| 증상 | 원인 / 해결 |
| --- | --- |
| `TLS handshake timeout` | Docker 메모리 부족 → 메모리 증설 또는 다른 클러스터 중지 후 `k3d cluster stop/start local-k8s` |
| 다른 프로젝트 리소스가 보임 | context 확인 → `kubectl config use-context k3d-local-k8s` |
| Pod `ErrImageNeverPull` | `k3d image import api:1.0 -c local-k8s` 누락 |
| Pod `CrashLoopBackOff` / Not Ready | `kubectl -n app logs <pod>`, `kubectl -n app describe pod <pod>` 로 probe(`/actuator/health/*`) 실패 여부 확인 |
| `port is already allocated` (클러스터 생성 시) | 호스트 8080 포트를 다른 프로세스가 사용 중 |
