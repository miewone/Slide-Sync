# Cloudflare 배포

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
