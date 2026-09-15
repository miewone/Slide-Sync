# Cloudflare 배포

## 방문 통계 (GA4)

Cloudflare의 빌드 환경 변수에 `VITE_GA4_MEASUREMENT_ID`를 추가하고, 값으로 GA4 웹 데이터 스트림의 측정 ID(`G-XXXXXXXXXX`)를 입력한 뒤 다시 빌드·배포합니다. Worker 런타임 변수만 설정하면 정적 파일 빌드에 반영되지 않습니다. 개인 측정 ID는 저장소에 넣지 않습니다.

`npm run build`의 운영 빌드에서 ID가 설정된 경우에만 Google 태그가 HTML에 삽입됩니다. ID가 없거나 `npm run dev`로 실행하면 태그를 로드하지 않습니다. ID를 넣어 만든 운영 빌드는 로컬 `npm run preview`에서도 추적하므로, 일반적인 로컬 검증에서는 변수를 설정하지 마세요. 설정 변경은 다시 빌드해야 반영되며, 측정 ID는 브라우저에서 확인 가능한 공개 식별자입니다.

`vite.config.js`는 GA4가 활성화된 빌드에만 Google 태그 및 Analytics 수집 출처를 CSP에 허용하고, 인라인 초기화 코드는 빌드 시 SHA-256 해시로 허용합니다. 광고 기능용 출처는 추가하지 않았습니다. 허용 출처는 [Google의 CSP 안내](https://developers.google.com/tag-platform/security/guides/csp)를 기준으로 합니다.

배포 후 사이트를 열고 GA4 실시간 보고서에서 방문을 확인하세요. 개발자 도구에서 Google 태그와 수집 요청의 CSP 차단 여부도 확인합니다. 편집·다운로드용 사용자 정의 이벤트는 추가하지 않았으며, 자동 이벤트는 GA4 향상된 측정 설정에 따릅니다.

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

Picker의 API 키에서 애플리케이션 제한을 **웹사이트**로 설정한 경우, 허용 목록에 `http://localhost:5173/*`, `https://slide-sync.dlsrk489.workers.dev/*`, **`https://docs.google.com/*`**를 등록합니다. Picker는 docs.google.com의 iframe에서 실행되므로 이 주소를 빠뜨리면 “API 개발자 키가 잘못되었습니다” 오류가 발생할 수 있습니다. API 제한에는 Google Picker API를 포함합니다. 이는 OAuth의 승인된 JavaScript 원본과 별도 설정입니다. [Google 공식 안내](https://developers.google.com/workspace/drive/picker/guides/web-picker#create_an_api_key)


Drive 버튼은 PPTX와 Google Slides를 열고 저장합니다. 실제 연동에는 같은 Google Cloud 프로젝트의 다음 빌드 환경 변수가 필요합니다.

| 변수 | 값 |
| --- | --- |
| `VITE_GOOGLE_CLIENT_ID` | 웹 애플리케이션 OAuth 클라이언트 ID (`…apps.googleusercontent.com`) |
| `VITE_GOOGLE_API_KEY` | Google Picker용 브라우저 API 키 |
| `VITE_GOOGLE_APP_ID` | Google Cloud **프로젝트 번호** (프로젝트 이름/문자열 ID가 아님) |

1. Google Cloud에서 **Google Drive API, Google Slides API, Google Picker API**를 활성화합니다.
2. Google Auth Platform의 동의 화면을 설정합니다. 개발 중에는 테스트 사용자를 등록합니다. 앱은 사용자가 선택하거나 앱에서 만든 파일에 접근하는 `https://www.googleapis.com/auth/drive.file` 권한을 요청합니다.
3. 웹 OAuth 클라이언트의 승인된 JavaScript 원본에 실제 사이트 원본을 등록합니다. 개발용으로는 `http://localhost:5173`처럼 Google이 허용하는 localhost 원본을 등록하고 해당 주소로 접속합니다. 포트도 일치해야 합니다.
4. API 키에는 HTTP 리퍼러 제한(운영 도메인 및 개발 주소)과 필요한 API 제한을 적용합니다. **OAuth 클라이언트 비밀키는 프런트엔드에 넣지 않습니다.** 위 세 값은 브라우저에 노출되는 공개 식별자입니다.
5. 로컬에서는 `.env.local`, Cloudflare에서는 빌드 환경 변수에 값을 설정하고 다시 빌드합니다. Worker 런타임 변수만 변경하면 반영되지 않습니다.
6. 앱의 **Google Drive → Google 연결 → Drive에서 열기**로 파일을 선택합니다. 저장 시 원본/새 파일을 선택하며, 새 파일은 이름과 폴더를 지정합니다. 폴더를 지정하지 않으면 내 드라이브 최상위에 저장합니다.

변수가 모두 설정된 빌드에만 Google 인증·Picker·API·Slides 이미지 출처를 CSP에 추가합니다. 실제 라이브러리는 사용자가 Drive 창을 열 때 로드합니다. 토큰은 메모리에만 보관하고 만료 시 사용자가 다시 연결합니다. 연결 해제는 현재 탭의 토큰을 삭제하며 Google 계정의 앱 권한을 취소하지는 않습니다. 서버 저장소나 클라이언트 비밀키는 사용하지 않습니다. 기존 PPTX 미리보기의 스크립트 차단 CSP는 유지합니다.

Slides는 `presentations.get`으로 읽고 객체 이동/삭제 요청만 `batchUpdate`로 저장합니다. PPTX로 변환하거나 문서 전체를 교체하지 않습니다. 새 Slides 문서는 Drive `files.copy`로 원본 구조를 복사한 뒤 수정합니다. 편집 권한이 있으면 원본 저장, 복사 권한이 있으면 새 문서 저장을 사용할 수 있습니다. 원본 버전이 바뀌었거나 복사본 구조가 예상과 다르면 변경 적용을 중단합니다. 복사 후 적용 실패 시 생성된 문서 링크를 표시하며, 자동 삭제·재시도는 하지 않습니다.

PPTX 원본 저장은 파일 버전 확인과 ETag 조건부 업로드를 사용합니다. 응답에서 ETag를 읽을 수 없는 환경에서는 원본 저장을 거부하고 새 파일 저장을 안내합니다. 네트워크 오류로 저장 결과를 확인할 수 없다면 Google Drive에서 결과를 확인한 뒤 재시도합니다.

### 검증 범위

`npm test`에는 네이티브 구조·그룹·서식 보존, 범위·실행 취소, 원본/복사본 요청, 충돌, 업로드 제한 검증이 포함됩니다. `npm run test:browser -- --check-google-drive`는 Google 응답을 모의한 UI/REST 통합 검증이며 Google 계정에 접근하지 않습니다. 배포 후 실제 계정에서 OAuth 팝업, Picker 파일/폴더 선택, 토큰 만료 후 재연결, Slides 원본/복사본 저장, PPTX 원본/새 파일 저장과 CSP를 확인해야 합니다. Google Cloud 설정이 없는 로컬 테스트는 실제 계정 연동 성공을 보장하지 않습니다.

공식 문서: [Picker](https://developers.google.com/workspace/drive/picker/guides/web-picker-sample), [Google 인증](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [Slides 객체 수정](https://developers.google.com/workspace/slides/api/guides/transform), [Slides 버전 제어](https://developers.google.com/workspace/slides/api/reference/rest/v1/presentations/batchUpdate).

### API 사용 비용 (2026-09-15 확인)

Google Slides API의 표준 사용은 추가 비용이 없으며, Drive API도 일일 기준 사용량 이하는 무료입니다. Google은 2026년 중 기준 초과 사용량에 대한 과금을 예고하고 있으며, 시행 전 최소 90일 안내를 예정하고 있습니다. 운영 시 Cloud 프로젝트의 할당량과 과금 공지를 확인하세요. 이 앱은 편집 중 변경을 메모리에 모으고 저장 시 일괄 요청하며, API 쓰기를 자동 재시도하지 않습니다.

출처: [Slides 가격](https://developers.google.com/workspace/slides/api/limits#pricing), [Drive 일일 기준](https://developers.google.com/workspace/drive/api/guides/limits#daily_billing_threshold), [Workspace API 과금 변경 안내](https://developers.google.com/workspace/tools-safety).

### 파일 선택 후 연결 실패

Picker에서 파일을 선택한 뒤 “Google에 연결하지 못했습니다”가 나타나고 API 요청이 Network에 없다면, 오래된 빌드의 `fetch` 호출 오류일 수 있습니다. `GoogleFiles`의 브라우저 전송은 함수 호출 형태로 실행해야 합니다. 객체 메서드로 호출하면 Chrome에서 `Illegal invocation`이 발생합니다. 수정 소스로 개발 서버를 재시작하거나 다시 빌드·배포하세요. Drive 브라우저 테스트는 모의 Google 응답 적용 전에 실제 `Window.fetch`로 로컬 파일을 요청해 이 오류를 검증합니다.
