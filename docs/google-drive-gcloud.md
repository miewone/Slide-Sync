# gcloud로 Google Drive 연동 설정하기

앱의 **내 Google API 설정 → gcloud로 설정하기**에서도 현재 사이트 주소를 반영한 명령을 복사할 수 있습니다. 이 안내는 사용자가 자신의 프로젝트에서 실행할 명령을 제공하며, 앱이 명령을 자동 실행하지 않습니다.

## 1. CLI에서 준비

Google Cloud CLI가 설치된 Bash 또는 Google Cloud Shell을 사용합니다. 프로젝트는 먼저 만들거나 기존 프로젝트를 선택하고, 아래 `your-project-id`를 실제 **프로젝트 ID**로 바꿉니다. API 활성화와 API 키 생성 권한이 필요합니다. Cloud Shell에서 올바른 계정으로 로그인된 경우 `gcloud auth login`은 생략할 수 있습니다.

```bash
# Bash / Google Cloud Shell
# Replace with your existing Google Cloud project ID (not project number).
SLIDE_SYNC_PROJECT_ID='your-project-id'
SLIDE_SYNC_KEY_ID='slide-sync-browser'

# Skip login if Cloud Shell is already signed in to the correct account.
gcloud auth login

gcloud services enable \
  serviceusage.googleapis.com \
  apikeys.googleapis.com \
  drive.googleapis.com \
  slides.googleapis.com \
  picker.googleapis.com \
  --project="$SLIDE_SYNC_PROJECT_ID"

# Create a dedicated, restricted Picker key.
gcloud services api-keys create \
  --project="$SLIDE_SYNC_PROJECT_ID" \
  --key-id="$SLIDE_SYNC_KEY_ID" \
  --display-name='Slide Sync browser' \
  --api-target=service=picker.googleapis.com \
  --allowed-referrers='https://slide-sync.dlsrk489.workers.dev/*,https://docs.google.com/*'

# Copy this output into the app's API Key field.
gcloud services api-keys get-key-string "$SLIDE_SYNC_KEY_ID" \
  --project="$SLIDE_SYNC_PROJECT_ID" \
  --location=global \
  --format='value(keyString)'

# Copy this output into the app's Project number field.
gcloud projects describe "$SLIDE_SYNC_PROJECT_ID" \
  --format='value(projectNumber)'
```

이 명령은 기존 gcloud 기본 프로젝트 설정을 변경하지 않고 각 요청에 프로젝트를 명시합니다. API 키는 Picker API와 허용 웹사이트로 제한됩니다. 로컬 사이트에서도 쓸 경우 생성 명령의 허용 목록에 `http://localhost:5173/*`를 추가하세요. `https://docs.google.com/*`는 Picker에 필요합니다.

같은 키 ID가 이미 있다면 생성 단계는 실패합니다. 새 키 ID를 사용하거나, 기존 키의 API·웹사이트 제한을 확인한 뒤 생성 단계를 건너뛰고 키를 조회하세요. API 키 조회 결과는 앱의 **API Key**에, 마지막 숫자 출력은 **프로젝트 번호**에 입력합니다. API Keys API가 활성화되지 않거나 권한이 부족하면 해당 단계의 오류를 해결한 뒤 계속 진행합니다.

## 2. 콘솔에서 웹 OAuth 클라이언트 만들기

1. 같은 프로젝트의 [Google Auth Platform 브랜딩](https://console.cloud.google.com/auth/branding)에서 동의 화면을 설정합니다. 외부 사용자 대상으로 테스트 중이면 **대상 → 테스트 사용자**에 사용할 Google 계정을 추가합니다.
2. [클라이언트](https://console.cloud.google.com/auth/clients)에서 **웹 애플리케이션** 유형을 만듭니다. 이 앱의 Google 사용자 인증용 웹 OAuth 클라이언트는 콘솔 절차로 안내합니다.
3. 승인된 JavaScript 원본에 `https://slide-sync.dlsrk489.workers.dev`를 입력합니다. 로컬은 `http://localhost`와 `http://localhost:5173`을 추가합니다. 현재 앱의 팝업 토큰 방식에서는 리디렉션 URI를 입력하지 않습니다.
4. 발급된 **클라이언트 ID**를 앱에 입력하고 **이 브라우저에 저장**을 누릅니다. **클라이언트 Secret은 사용하지 않습니다.**

저장된 설정은 해당 사이트의 IndexedDB에 보관됩니다. 자세한 동작과 비용 안내는 [배포 문서](deployment.md#google-drive--google-slides-연동)를 참고하세요.

## 공식 문서

- [API 활성화](https://docs.cloud.google.com/sdk/gcloud/reference/services/enable)
- [제한된 API 키 생성](https://docs.cloud.google.com/sdk/gcloud/reference/services/api-keys/create)
- [API 키 문자열 조회](https://docs.cloud.google.com/sdk/gcloud/reference/services/api-keys/get-key-string)
- [프로젝트 조회](https://docs.cloud.google.com/sdk/gcloud/reference/projects/describe)
- [웹 OAuth 인증 정보 생성](https://developers.google.com/workspace/guides/create-credentials)
