#!/usr/bin/env bash
# api 빌드 → 이미지 import → 매니페스트 적용 → 재시작 → 상태 확인
set -euo pipefail

CLUSTER="local-k8s"
IMAGE="api:1.0"
NAMESPACE="app"
DEPLOYMENT="api"

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "==> kubectl context 전환: k3d-${CLUSTER}"
kubectl config use-context "k3d-${CLUSTER}" >/dev/null

echo "==> api 빌드"
(cd "${ROOT}/api" && ./gradlew clean bootJar)

echo "==> 도커 이미지 빌드: ${IMAGE}"
docker build -t "${IMAGE}" "${ROOT}/api"

echo "==> 이미지 import: ${CLUSTER}"
k3d image import "${IMAGE}" -c "${CLUSTER}"

echo "==> 매니페스트 적용"
kubectl apply -f "${ROOT}/k8s/base/"

echo "==> 재시작"
kubectl -n "${NAMESPACE}" rollout restart "deployment/${DEPLOYMENT}"
kubectl -n "${NAMESPACE}" rollout status "deployment/${DEPLOYMENT}"

echo "==> 완료"
kubectl -n "${NAMESPACE}" get pods
