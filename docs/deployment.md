# Cloudflare Pages 배포


**Git 연동 Cloudflare Pages** 방식을 사용합니다. 이 프로젝트는 React/Vite 소스를 빌드해야 하므로 다음 설정으로 연결합니다.

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

