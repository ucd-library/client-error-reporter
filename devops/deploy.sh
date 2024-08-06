#! /bin/bash

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $ROOT_DIR

gcloud config set project digital-ucdavis-edu

./cloudbuild.sh

IMAGE_TAG=$(git describe --tags --abbrev=0 || true)
if [[ -z "$IMAGE_TAG" ]]; then
  IMAGE_TAG=$(git rev-parse --abbrev-ref HEAD)
fi

echo "Deploying to Google Cloud..."
gcloud run deploy client-error-reporter \
  --image gcr.io/digital-ucdavis-edu/client-error-reporter:$IMAGE_TAG \
  --platform managed \
  --region us-west1 \
  --set-env-vars=ALLOWED_DOMAINS_PATH=/config/domains/domains.txt,SERVER_KEY_PATH=/config/key/key.txt \
  --set-secrets="/config/domains/domains.txt=client-error-reporter-domains:latest,/config/key/key.txt=client-error-reporter-key:latest" \
  --allow-unauthenticated

