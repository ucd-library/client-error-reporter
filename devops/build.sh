#! /bin/bash

set -e
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

cd $ROOT_DIR/..

IMAGE_NAME="client-error-reporter"
BUILD_CMD="docker buildx build --output=type=docker --cache-to=type=inline,mode=max"

REGISTRY="gcr.io/digital-ucdavis-edu/"
if [[ $LOCAL_DEV == 'true' ]]; then
  REGISTRY="localhost/local-dev/"
else
  BUILD_CMD="$BUILD_CMD --pull"
fi

BUILD_DATETIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if [[ -z "$SHORT_SHA" ]]; then
  SHORT_SHA=$(git log -1 --pretty=%h)
fi
if [[ -z "$BRANCH_NAME" ]]; then
  BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)
  IMAGE_TAG=$BRANCH_NAME
fi
if [[ -z "$TAG_NAME" ]]; then
  TAG_NAME=$(git describe --tags --abbrev=0 || true)
fi

IMAGE_TAG=$BRANCH_NAME
if [[ ! -z "$TAG_NAME" ]]; then
  IMAGE_TAG=$TAG_NAME
fi

echo "Building $REGISTRY$IMAGE_NAME:$IMAGE_TAG"

$BUILD_CMD \
  --build-arg SHORT_SHA=$SHORT_SHA \
  --build-arg TAG_NAME=$TAG_NAME \
  --build-arg BRANCH_NAME=$BRANCH_NAME \
  --build-arg BUILD_DATETIME=$BUILD_DATETIME \
  -t $REGISTRY$IMAGE_NAME:$IMAGE_TAG .

if [[ $LOCAL_DEV != 'true' ]]; then
  echo "Pushing $REGISTRY$IMAGE_NAME:$IMAGE_TAG"
  docker push $REGISTRY$IMAGE_NAME:$IMAGE_TAG
fi