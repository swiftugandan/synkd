#!/usr/bin/env bash
# Resolve a working container CLI: prefer podman, then docker.
set -euo pipefail

resolve_container_cli() {
  if [[ -n "${CONTAINER_CLI:-}" ]]; then
    if command -v "$CONTAINER_CLI" >/dev/null 2>&1 && "$CONTAINER_CLI" info >/dev/null 2>&1; then
      echo "$CONTAINER_CLI"
      return 0
    fi
    echo "CONTAINER_CLI=$CONTAINER_CLI is set but not usable" >&2
    return 1
  fi

  if command -v podman >/dev/null 2>&1 && podman info >/dev/null 2>&1; then
    echo podman
    return 0
  fi

  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    echo docker
    return 0
  fi

  echo "Neither podman nor docker is available/running." >&2
  echo "Install Podman (preferred) or start Docker Desktop, then retry." >&2
  return 1
}

resolve_compose_cli() {
  local runtime
  runtime="$(resolve_container_cli)"

  if [[ "$runtime" == "podman" ]]; then
    if podman compose version >/dev/null 2>&1; then
      echo "podman compose"
      return 0
    fi
    if command -v podman-compose >/dev/null 2>&1; then
      echo "podman-compose"
      return 0
    fi
  fi

  if [[ "$runtime" == "docker" ]] && docker compose version >/dev/null 2>&1; then
    echo "docker compose"
    return 0
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
    return 0
  fi

  echo "No compose plugin found for $runtime" >&2
  return 1
}