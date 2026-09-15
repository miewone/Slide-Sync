# Slide Sync — Windows 에이전트용 로컬 AI 연결 설정

이 문서를 사용자 PC의 Codex 또는 Claude Code에 전달하면, 에이전트가 현재 설치 상태를 점검하고 Slide Sync 연결 서버를 설정할 수 있습니다.

> **현재 공개 범위: 설치 안내 문서만 공개했습니다.** 연결 서버 코드·설치 ZIP·AI 채팅 UI의 공개 또는 배포 완료를 뜻하지 않습니다. 런타임이 없는 PC에서는 이 문서만으로 설치를 완료할 수 없습니다. 사용자가 별도로 제공한 연결 서버 ZIP 또는 소스 폴더를 사용하세요. GitHub의 현재 `main`에 연결 코드가 있다고 가정하지 마세요.

## 사용자: 에이전트에게 이렇게 요청하세요

```text
이 문서를 읽고 내 Windows PC에서 Slide Sync의 로컬 AI 연결을 설정해줘.
이미 설치된 Codex 또는 Claude Code와 기존 로그인을 사용해줘.
운영 사이트와 로컬 개발 주소를 모두 연결할 수 있도록 설정하고 실제 확인한 결과를 알려줘.
연결 서버 파일이 없으면 ZIP 또는 소스 폴더 위치를 물어봐.
로그인이나 브라우저 권한처럼 내가 직접 해야 하는 단계는 알려줘.
```

## 목표와 고정 주소

| 용도 | 주소 |
| --- | --- |
| 운영 화면 | https://slide-sync.dlsrk489.workers.dev/ |
| 개발·테스트 화면 | http://127.0.0.1:5173/ |
| Windows 로컬 연결 서버 | http://127.0.0.1:4318 |

서버의 허용 origin에는 마지막 `/`를 제외한 다음 **두 주소**를 함께 지정합니다.

```text
https://slide-sync.dlsrk489.workers.dev
http://127.0.0.1:5173
```

`http://localhost:5173`은 다른 origin입니다. 위 테스트 주소를 그대로 사용하세요. 서버는 Windows의 `127.0.0.1`에만 바인딩하며 공개 터널이나 공유기 포트 개방은 필요하지 않습니다.

## 에이전트 실행 지침

### 1. 실제 Windows 환경과 기존 설치 확인

PowerShell에서 확인합니다. WSL 안에만 설치된 CLI를 Windows 설치로 판정하지 마세요.

```powershell
Get-Command node, codex, claude -ErrorAction SilentlyContinue |
  Select-Object Name, Source
node --version
```

발견한 CLI에 대해서만 `codex --version` 또는 `claude --version`을 실행합니다. 둘 중 하나만 있어도 그 공급자로 연결할 수 있습니다.

- 연결 서버의 기준 Node.js 버전은 **22.19.0**입니다. 제공받은 런타임의 버전 요구사항을 확인하세요.
- 기존 CLI와 로그인은 재사용합니다. 동작하는 설치를 임의로 재설치하거나 계정을 변경하지 마세요.
- 필요한 실행 환경이 없으면 누락 항목을 정확히 보고하고, 사용자 PC의 설치 권한·정책에 맞게 설치를 진행하세요.
- 인증 파일 내용이나 API 키를 읽어 출력하거나 프로젝트·문서·GitHub로 복사하지 마세요. 로그인 필요 시 해당 CLI의 공식 로그인 흐름을 사용하고 사용자 인증 입력은 사용자에게 맡깁니다.

### 2. 연결 서버 파일 확보 및 검증

사용자가 제공한 ZIP 또는 소스 폴더 위치를 확인합니다. 파일이 없으면 위치나 제공을 요청하세요. 존재하지 않는 GitHub 다운로드 URL을 만들어내거나, 설치를 완료했다고 보고하지 마세요.

ZIP이라면 새 폴더에 압축을 풀어 기존 파일을 덮어쓰지 않습니다. 설치 위치는 사용자가 지정한 경로를 우선하며, 미지정 시 `%LOCALAPPDATA%\SlideSyncAI` 아래 새 폴더를 사용할 수 있습니다.

서버 실행 폴더에는 최소한 다음 파일이 있어야 합니다.

```text
package.json
scripts/local-ai-server.mjs
server/LocalAiServer.js
server/CliLauncher.js
server/AiProviders.js
src/ai/protocol.js
```

실행 전에 코드를 읽고 다음을 확인합니다.

- 서버의 bind 주소는 `127.0.0.1`, 포트는 `4318`입니다.
- 여러 `--origin` 인자를 받아 두 origin을 동시에 허용합니다.
- 요청 origin·Host·연결 토큰을 검증합니다. CORS를 `*`로 풀지 않습니다.
- 브라우저 입력을 임의 셸 명령으로 실행하지 않습니다.
- Codex·Claude 실행 경로는 Windows CLI를 가리킵니다.

이 기능을 지원하지 않는 이전 ZIP이면 두 주소가 동작한다고 보고하지 말고, 업데이트된 런타임이 필요함을 알리세요. 서버 전용 패키지는 Node 표준 모듈만 사용하므로 **`npm install`이나 `npm ci`가 필요하지 않습니다.**

### 3. CLI 경로와 포트 확인

PATH에서 찾은 명령을 우선 사용합니다. 별도 경로가 필요한 경우에만 현재 PowerShell 세션에 지정합니다. 아래 사용자명은 실제 경로로 바꾸고 파일 존재를 확인하세요.

```powershell
$env:SLIDE_SYNC_CODEX_PATH = 'C:\Users\YOUR-NAME\AppData\Roaming\npm\codex.cmd'
$env:SLIDE_SYNC_CLAUDE_PATH = 'C:\Users\YOUR-NAME\.local\bin\claude.exe'
```

지원 대상은 네이티브 `.exe`, 표준 npm `codex.cmd`/`claude.cmd`와 해당 패키지의 JS 진입점입니다. 두 환경변수를 무조건 설정하지 마세요.

`4318` 포트가 이미 사용 중이면 프로세스를 확인합니다. 다른 프로그램을 임의로 종료하지 마세요. 기존 Slide Sync 서버라면 허용 origin과 사용자 사용 여부를 확인한 후 재사용하거나 재시작합니다.

### 4. 서버 실행

서버 실행 폴더에서 다음 명령을 실행합니다.

```powershell
node scripts/local-ai-server.mjs --origin https://slide-sync.dlsrk489.workers.dev --origin http://127.0.0.1:5173
```

별도 터미널 창에 계속 실행해 두세요. 에이전트의 단기 명령 실행 시간이 끝나면서 서버가 같이 종료되지 않게 해야 합니다. 서버가 실제로 살아 있는지 확인하고 종료 방법(`Ctrl+C`)을 사용자에게 알려주세요. Windows 시작 프로그램이나 서비스 등록은 이 설정의 기본 범위에 포함하지 않습니다.

출력된 연결 토큰은 사용자 브라우저의 AI 편집 패널에 입력할 값입니다. 토큰을 GitHub 이슈나 공유 문서에 붙이지 마세요. 재시작하면 토큰이 바뀝니다.

### 5. 두 origin의 연결 검사

서버가 실행된 상태에서 아래 PowerShell로 두 주소의 CORS 허용을 검사할 수 있습니다. 이 검사는 AI 추론을 실행하지 않습니다.

```powershell
$origins = @(
  'https://slide-sync.dlsrk489.workers.dev',
  'http://127.0.0.1:5173'
)
foreach ($origin in $origins) {
  $response = Invoke-WebRequest -UseBasicParsing -Method Options `
    -Uri 'http://127.0.0.1:4318/propose' `
    -Headers @{
      Origin = $origin
      'Access-Control-Request-Method' = 'POST'
      'Access-Control-Request-Headers' = 'authorization,content-type'
    }
  if ($response.StatusCode -ne 204 -or
      $response.Headers['Access-Control-Allow-Origin'] -ne $origin) {
    throw "Origin check failed: $origin"
  }
  Write-Host "Origin allowed: $origin"
}
```

토큰 없이 `/status`를 요청하면 `401`, 허용하지 않은 origin에서는 `403`이어야 합니다. 실제 연결 토큰을 사용한 `/status` 검사나 브라우저의 **로컬 서버 연결 확인**도 수행하세요. `/status`의 CLI 발견 결과는 로그인 또는 추론 성공을 증명하지 않습니다.

### 6. 브라우저 화면과 연결

운영 화면을 열고 **AI 편집 · Codex / Claude Code** 패널이 있는지 확인합니다.

- 패널이 없으면 운영 화면에 AI 기능이 아직 배포되지 않은 것입니다. 로컬 서버 재설치로 해결되지 않습니다. 이 경우 배포가 필요하다고 보고하세요.
- 로컬 개발 화면이 필요하고 전체 Slide Sync 소스를 제공받았다면 별도 터미널에서 프로젝트의 잠금 의존성을 설치한 뒤 실행합니다.

```powershell
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

서버 전용 ZIP에는 React 화면 소스가 없으므로 위 개발 서버 명령을 실행할 수 없습니다. 테스트 화면은 브라우저를 사용하는 Windows에서 `http://127.0.0.1:5173/`으로 접근 가능해야 합니다.

AI 패널이 있는 화면에서 연결 토큰을 입력하고 연결을 확인합니다. 브라우저의 로컬 네트워크 접근 권한이나 계정 인증처럼 사용자 조작이 필요한 단계는 사용자에게 맡깁니다. 브라우저 전체 보안을 비활성화하거나 인증을 우회하지 마세요.

Cloudflare 페이지의 CSP `connect-src`에는 `http://127.0.0.1:4318`이 허용되어 있어야 합니다. HTML과 HTTP 응답 헤더에 정책이 각각 있으면 둘 다 만족해야 합니다. 차단되는 경우 필요한 설정을 보고하며, 이 PC 설정 작업만으로 운영 사이트를 배포하거나 변경하지 마세요.

### 7. 편집 검증과 완료 보고

샘플 PPTX 또는 사용자가 지정한 테스트 파일로 다음을 확인합니다. 사용자 문서를 임의로 선택하여 AI에 보내지 마세요.

1. 수정할 슬라이드만 체크합니다.
2. 설치된 공급자를 선택하고 짧은 텍스트 변경을 요청합니다.
3. 수정안을 검토하고 적용합니다.
4. 미리보기, 실행 취소·다시 실행, 수정본 다운로드를 확인합니다.

요청 시 체크한 슬라이드 텍스트와 대화가 선택한 AI 서비스로 전달됩니다. 실제 추론은 계정 이용 한도·요금에 영향을 줄 수 있습니다. 현재 편집 범위는 기존 텍스트이며 이미지·슬라이드 추가와 레이아웃 변경은 포함하지 않습니다.

완료 보고에는 **직접 확인한 항목만** 기록합니다.

- 설치 경로, Node.js·CLI 버전과 사용한 공급자
- 서버 실행 상태와 재시작·종료 방법
- 운영 origin / 개발 origin 각각의 CORS 검사 결과
- 실제 화면 연결, 로그인·추론, 편집·다운로드 확인 여부
- 미확인 사항과 사용자가 해야 할 작업

단순 파일 복사, 포트 열림 또는 CORS 성공을 전체 연결 완료로 보고하지 마세요. 코드를 아직 제공받지 못했거나 UI가 미배포라면 그 상태를 명확히 구분합니다.
