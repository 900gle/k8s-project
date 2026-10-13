#!/usr/bin/env bash
# (코드 변경 시에만) api 빌드 → 이전 이미지 삭제 → 이미지 import → 매니페스트 적용 → 재시작 → 상태 확인
set -euo pipefail

CLUSTER="local-k8s"
IMAGE="api:1.0"
NAMESPACE="app"
DEPLOYMENT="api"

ROOT="$(cd "$(dirname "$0")" && pwd)"

# 단계 시작 시 직전 단계 소요 시간을 함께 출력
STEP_NAME=""
STEP_START=$SECONDS
step() {
  if [[ -n "${STEP_NAME}" ]]; then
    echo "    (${STEP_NAME}: $((SECONDS - STEP_START))초)"
  fi
  STEP_NAME="$1"
  STEP_START=$SECONDS
  echo "==> $1"
}
trap 'echo "    (${STEP_NAME}: $((SECONDS - STEP_START))초)"; echo "==> 총 소요: ${SECONDS}초"' EXIT

step "kubectl context 전환: k3d-${CLUSTER}"
kubectl config use-context "k3d-${CLUSTER}" >/dev/null

# api 소스 해시 (빌드 산출물 제외)
SRC_HASH="$(cd "${ROOT}" && git ls-files -co --exclude-standard api | sort | xargs shasum | shasum | cut -d' ' -f1)"
OLD_HASH="$(docker image inspect "${IMAGE}" --format '{{ index .Config.Labels "src.hash" }}' 2>/dev/null || true)"
OLD_ID="$(docker image inspect "${IMAGE}" --format '{{.Id}}' 2>/dev/null || true)"
NODE="k3d-${CLUSTER}-server-0"

BUILT=false
if [[ "${SRC_HASH}" == "${OLD_HASH}" ]]; then
  echo "==> 코드 변경 없음: 빌드 건너뜀"
else
  echo "==> api 빌드"
  (cd "${ROOT}/api" && ./gradlew clean bootJar)

  echo "==> 도커 이미지 빌드: ${IMAGE}"
  docker build --label "src.hash=${SRC_HASH}" -t "${IMAGE}" "${ROOT}/api"
  BUILT=true

  NEW_ID="$(docker image inspect "${IMAGE}" --format '{{.Id}}')"
  if [[ -n "${OLD_ID}" && "${OLD_ID}" != "${NEW_ID}" ]]; then
    echo "==> 이전 이미지 삭제"
    docker rmi "${OLD_ID}" >/dev/null 2>&1 || true
  fi
fi

# 새로 빌드했거나 클러스터 노드에 이미지가 없을 때만 import
if [[ "${BUILT}" == true ]] || ! docker exec "${NODE}" crictl images 2>/dev/null | grep -qE "(^|/)api +1\.0 "; then
  echo "==> 이미지 import: ${CLUSTER}"
  k3d image import "${IMAGE}" -c "${CLUSTER}"
  BUILT=true
fi

step "매니페스트 적용"
kubectl apply -f "${ROOT}/k8s/base/"

if [[ "${BUILT}" == true ]]; then
  echo "==> 재시작"
  kubectl -n "${NAMESPACE}" rollout restart "deployment/${DEPLOYMENT}"
fi
kubectl -n "${NAMESPACE}" rollout status "deployment/${DEPLOYMENT}"

step "완료"
kubectl -n "${NAMESPACE}" get pods
