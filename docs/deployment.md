# Cloudflare 배포

## 방문 통계 (GA4)

GA4 측정 ID는 `vite.config.js`에서 `G-E1J2X2B0FL`로 고정합니다. 별도의 서버 연결이나 `VITE_GA4_MEASUREMENT_ID` 환경 변수 설정 없이 브라우저에서 Google로 직접 전송합니다.

`npm run build`의 운영 빌드에는 GA4 설정과 통계 동의 배너를 제공합니다. Google 태그는 페이지 시작 시 삽입하지 않으며 **통계 수집 동의**를 선택한 뒤 로드합니다. 동의 전·거부 상태에서는 GA4 태그 요청을 보내지 않습니다. 개발 서버에서는 통계 수집을 시작하지 않습니다.

동의와 거부를 같은 수준의 버튼으로 제공하며, 거부해도 편집·Drive 기능은 사용할 수 있습니다. 하단 **쿠키 설정**에서 선택을 변경할 수 있습니다. 선택은 localStorage에 180일 동안 기억하며 만료·측정 ID 변경 시 다시 묻습니다. 철회하면 Google 수집 중지 플래그를 설정하고 접근 가능한 해당 사이트의 GA 쿠키를 삭제합니다. 이미 전송된 데이터까지 회수하는 기능은 아닙니다. 문서·Google 설정 저장소는 삭제하거나 새로고침하지 않습니다.

GA4는 광고 관련 동의를 항상 거부 상태로 두고 Google signals·광고 개인화 기능을 끕니다. 통계 쿠키에는 `slide_sync` 접두사를 사용하며 호스트 단위로 설정합니다. 운영 빌드에서 Analytics 출처를 CSP에 허용합니다. [Google 동의 모드](https://developers.google.com/tag-platform/security/guides/consent), [수집 중지 설정](https://developers.google.com/tag-platform/security/guides/privacy).

Cloudflare의 보안·접속 처리와 GA4의 선택적 통계 수집은 별도입니다. Cloudflare 대시보드에서 자동 삽입하는 Web Analytics·Zaraz·추가 추적 태그는 앱 소스에서 확인하거나 이 배너로 제어하지 않습니다. 그런 기능을 사용하는 경우 제공자 동작과 적용 지역의 요구사항을 별도로 확인해야 합니다. 이 변경은 Cloudflare 설정을 변경하지 않습니다.

배포 후 동의 전·거부 상태에서 Google 태그 요청이 없는지 Network에서 확인하고, 동의 후 GA4 실시간 보고서에서 방문을 확인하세요. `npm run test:browser -- --check-analytics-consent`는 테스트 ID와 모의 태그로 동의 전 요청 차단, 거부 유지, 철회, 편집 상태 보존을 검증합니다. 기본 테스트 포트 외 4191도 비어 있어야 합니다.

## Workers Git 연동 (현재 배포 설정)

저장소 루트의 `wrangler.jsonc`에서 Worker 이름 `slide-sync`, 호환성 날짜 `2026-09-11`, 정적 파일 디렉터리 `./dist`를 지정합니다. 날짜는 배포 오류 로그에서 안내한 값을 사용합니다. Worker 이름을 바꾸면 설정 파일의 `name`도 대시보드 이름과 일치시켜야 합니다.

| 설정 | 값 |
| --- | --- |
| Production branch | `main` |
| Root directory | `/` (저장소 루트) |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Version command | `npx wrangler versions upload` |
| Node.js | `.node-version`의 `22.19.0` |

Workers 화면에는 빌드 출력 디렉터리 입력란이 없습니다. `wrangler.jsonc`의 `assets.directory`가 해당 역할을 합니다. 기존 명령에 `--assets ./dist`가 남아 있어도 같은 디렉터리를 지정하므로 사용할 수 있습니다. 빌드는 대시보드의 Build command가 수행합니다. 로컬 CLI에서는 먼저 `npm run build`를 실행해야 합니다.

설정 파일을 운영 브랜치에 커밋하고 push한 뒤 해당 커밋으로 배포합니다. 설정 파일이 없는 이전 커밋을 재시도하면 수정이 반영되지 않습니다. 배포 후 예제 열기, PPTX 편집 및 다운로드를 확인하세요. PPTX 처리는 브라우저 안에서 수행하며 기존 CSP를 포함한 `dist` 정적 파일만 배포합니다.

### 오류 확인

- `Error parsing file: .../vite.config.js`: 명시적인 Wrangler 설정 없이 자동 구성을 시도한 경우인지 확인합니다. 이 저장소의 `wrangler.jsonc`가 배포 커밋에 포함되어 있는지 확인하세요.
- `Worker name "undefined"`: `name`이 대시보드의 `slide-sync`와 일치하는지 확인합니다.
- `A compatibility_date is required`: `compatibility_date`가 있는 설정 파일이 배포 커밋에 포함되어 있는지 확인합니다.

공식 안내: [Workers 빌드 설정](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [정적 파일 설정](https://developers.cloudflare.com/workers/static-assets/binding/), [호환성 날짜](https://developers.cloudflare.com/workers/configuration/compatibility-dates/).

## Pages Git 연동

Pages를 선택하는 경우에는 다음 설정으로 연결합니다. 이 프로젝트는 React/Vite 소스를 빌드해야 합니다.

1. 이 프로젝트의 소스를 GitHub 또는 GitLab 저장소에 push합니다. `package-lock.json`과 `.node-version`을 포함하고, `node_modules/`, `dist/`, `artifacts/`는 제외합니다.
2. Cloudflare 대시보드에서 **Workers & Pages → Create application → Pages → Import from an existing Git repository**로 저장소를 연결합니다.
3. 빌드 설정을 아래와 같이 지정한 뒤 **Save and Deploy**를 실행합니다.

| 설정 | 값 |
| --- | --- |
| Production branch | 실제 운영 브랜치 선택 |
| Framework preset | `None` (빌드 명령 직접 지정) |
| Root directory | 이 프로젝트가 저장소 루트라면 비워 둠 |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js | `.node-version`의 `22.19.0` |

Cloudflare가 의존성을 설치하고 빌드합니다. 대시보드에 `NODE_VERSION` 환경 변수가 이미 설정되어 있다면 `.node-version`과 같은 버전으로 맞추세요. 별도 하위 폴더에 소스를 넣었다면 Root directory에 해당 경로를 지정합니다.

첫 배포 후 발급된 `https://<프로젝트명>.pages.dev`에서 확인하고, 이후 운영 브랜치에 push하면 자동으로 다시 배포됩니다. 이 주소에서는 기본 빌드 경로 `/`를 사용하므로 `--base=/slides/` 옵션은 필요하지 않습니다. 빌드 명령과 배포 폴더는 위 표의 값을 사용합니다.

Wrangler나 추가 라이브러리 없이 연결할 수 있습니다. PPTX 처리는 계속 브라우저 안에서 수행하며, 빌드 결과에는 기존 CSP와 로컬 렌더링 라이브러리가 포함됩니다. 배포 후 예제 열기, PPTX 편집 및 다운로드를 확인하세요.

공식 안내: [Vite 배포](https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/), [빌드 환경과 Node 버전](https://developers.cloudflare.com/pages/configuration/build-image/).

## Google Drive · Google Slides 연동

Google 설정은 사용자가 **PPTX 열기 → Google Drive → 내 Google API 설정**에서 직접 입력합니다. 사이트 운영자의 `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_API_KEY`, `VITE_GOOGLE_APP_ID`는 더 이상 읽거나 번들에 넣지 않습니다. 기존 Cloudflare 빌드 변수와 `.env.local`의 세 값은 삭제해도 됩니다.

| 사용자 입력 | Google Cloud에서 가져오는 값 |
| --- | --- |
| OAuth 클라이언트 ID | 웹 애플리케이션 클라이언트 ID (`…apps.googleusercontent.com`) |
| API Key | Google Picker용 브라우저 API 키 |
| 프로젝트 번호 | 같은 Google Cloud 프로젝트의 숫자 번호 |

각 사용자는 자신의 Google Cloud 프로젝트에서 Drive API, Slides API, Picker API를 활성화하고 웹 OAuth 클라이언트를 만들어야 합니다. 일반 Google 계정 로그인만으로 준비가 끝나는 방식은 아닙니다. API 사용량은 입력한 인증 정보의 프로젝트에 집계됩니다.

### 사용자 Google Cloud 설정

CLI 사용자는 [gcloud 설정 가이드](google-drive-gcloud.md)의 명령으로 API 활성화·API 키 생성·프로젝트 번호 조회를 진행할 수 있습니다. 앱 설정 창에도 현재 사이트 주소를 반영한 복사 가능한 명령이 있습니다.

1. 같은 프로젝트에서 **Google Drive API, Google Slides API, Google Picker API**를 활성화합니다.
2. OAuth 동의 화면을 설정하고, 테스트 상태이면 사용할 Google 계정을 테스트 사용자로 등록합니다.
3. 웹 OAuth 클라이언트의 승인된 JavaScript 원본에 `https://slide-sync.dlsrk489.workers.dev`를 등록합니다. 로컬에서는 `http://localhost`와 `http://localhost:5173`을 등록합니다. 앱 설정 화면에도 현재 등록할 원본이 표시됩니다.
4. API 키의 웹사이트 제한에 배포 주소(`https://slide-sync.dlsrk489.workers.dev/*`), 로컬 사용 시 `http://localhost:5173/*`, 그리고 **`https://docs.google.com/*`**를 등록합니다. Picker iframe의 출처가 빠지면 “API 개발자 키가 잘못되었습니다” 오류가 발생할 수 있습니다. API 제한에는 Google Picker API를 포함합니다.
5. 앱에서 세 값을 입력하고 **이 브라우저에 저장**을 누른 뒤 **Google 연결**을 진행합니다. **클라이언트 Secret은 입력하거나 배포하지 않습니다.**

설정은 해당 사이트의 IndexedDB에 저장됩니다. 다른 브라우저·기기·사이트 주소로는 공유되지 않습니다. 사이트 데이터를 삭제하면 다시 입력해야 합니다. **내 Google API 설정 → 저장한 설정 삭제**로 설정과 관련 연결 토큰을 지울 수 있습니다. 다른 설정으로 교체해도 이전 연결 토큰을 삭제합니다. 사용자가 입력한 API 키는 Google 요청에 사용되며 해당 사용자의 개발자 도구에서 확인할 수 있습니다. 브라우저 저장소는 같은 사이트의 JavaScript가 읽을 수 있으며 HttpOnly 저장소가 아닙니다.

### 정적 배포와 연결 유지

인증 서버나 클라이언트 Secret 없이 정적 파일로 배포합니다. CSP에는 사용자가 입력한 설정으로 연동할 수 있도록 Google 인증·Picker·API·Slides 이미지 출처를 허용하지만, 라이브러리는 유효한 설정으로 Drive를 열 때만 로드합니다. 기존 PPTX 미리보기의 스크립트 차단 CSP는 유지합니다.

접근 토큰과 만료 시간은 localStorage에 보관해 새로고침 후 복원합니다. Google의 토큰 유효기간을 연장하지 않으며 만료 시 다시 연결해야 합니다. 연결 해제는 토큰만 삭제하고 사용자 API 설정은 남깁니다. 저장소가 차단되면 설정 저장 오류를 표시하며 기존 로컬 PPTX 편집은 계속 사용할 수 있습니다.

Slides는 네이티브 객체 수정 요청만 전송하고 새 문서 저장은 원본을 복사한 뒤 수정합니다. 버전 충돌 시 변경 적용을 중단합니다. PPTX 원본 저장은 버전 검사와 ETag 조건부 요청을 사용하며, ETag를 확인할 수 없으면 새 파일 저장을 안내합니다.

### 검증

`npm test`와 `npm run test:browser -- --check-file-open`은 사용자 설정 검증, IndexedDB 저장·재열기·삭제, 연결 복원, 실제 브라우저 fetch, PPTX·Slides 원본/복사본 저장을 검사합니다. Google 응답은 모의하므로 실제 계정에서 OAuth, Picker, 쿠키 허용과 저장 권한을 별도로 확인해야 합니다.

공식 문서: [Picker 설정](https://developers.google.com/workspace/drive/picker/guides/web-picker), [Google 인증](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [Slides 버전 제어](https://developers.google.com/workspace/slides/api/reference/rest/v1/presentations/batchUpdate).

### API 사용 비용 (2026-09-15 확인)

Google Slides API의 표준 사용과 Drive API 일일 기준 사용량 이하는 추가 비용이 없습니다. Google은 2026년 중 기준 초과 사용량 과금을 예고하고 있으므로 각 사용자의 Cloud 프로젝트 할당량과 공지를 확인하세요. [Slides 가격](https://developers.google.com/workspace/slides/api/limits#pricing), [Drive 일일 기준](https://developers.google.com/workspace/drive/api/guides/limits#daily_billing_threshold), [Workspace API 안내](https://developers.google.com/workspace/tools-safety).


## 공개 개인정보처리방침·서비스 이용약관

로그인 없이 읽을 수 있는 한국어·영어 정적 페이지를 제공합니다. 앱 하단에서도 새 탭으로 열 수 있습니다.

| Google Auth Platform 입력 항목 | 배포 후 공개 URL |
| --- | --- |
| 애플리케이션 홈페이지 | `https://slide-sync.dlsrk489.workers.dev/` |
| 개인정보처리방침 | `https://slide-sync.dlsrk489.workers.dev/privacy.html` |
| 서비스 약관 | `https://slide-sync.dlsrk489.workers.dev/terms.html` |

`public/privacy.html`, `public/terms.html`, `public/legal.css`는 빌드 시 그대로 정적 파일에 포함됩니다. 이 페이지에는 로그인이나 JavaScript가 필요하지 않으며 GA4도 삽입하지 않습니다. `/slides/` 같은 하위 경로 배포도 상대 링크로 지원합니다. 새로운 배포가 완료되기 전에는 운영 URL에서 새 문서를 볼 수 없습니다.

배포 후 실제 공개 URL에서 문서가 보이는지 확인한 뒤 **Google Auth Platform → 브랜딩**의 링크 항목에 입력하세요. Google이 요구하면 연결된 도메인의 소유권과 브랜딩도 확인해야 합니다. 문서 링크 추가만으로 OAuth 검증 통과나 테스트 사용자 제한 해제가 보장되지는 않습니다. [Google 브랜드 검증 및 공개 정책 요구사항](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification).

문서는 현재 구현의 로컬 PPTX 처리, 사용자별 Google 설정, 브라우저 토큰 보관, Google API 데이터 이용, 삭제 방법, 운영 빌드의 GA4 및 Cloudflare 제공을 설명합니다. 운영자 연락처는 앱에 사용 중인 `dlsrk489@gmail.com`이며, 데이터 처리 방식이나 운영 정보가 달라지면 문서와 수정일을 함께 갱신하세요.
