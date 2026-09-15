# 미리보기 포맷 보정과 회귀 방어

## 확인한 원인

`네트워크 구성 참고.pptx`의 두 번째 슬라이드는 표의 `p:xfrm/a:ext`가 3,000,000 × 3,000,000 EMU인 반면 실제 열 너비와 행 높이 합계는 다릅니다. 미리보기와 선택 영역은 유효한 표 그리드를 기준으로 계산하고, 원본 XML은 유지합니다. 잘못되거나 비어 있는 그리드는 보정하지 않습니다.

동일한 `ctrTitle` 유형에 서로 다른 `idx`를 가진 자리표시자가 있습니다. 슬라이드→레이아웃 텍스트 상속은 유형보다 번호를 기준으로 매칭합니다. 번호 생략은 0, 유형 생략은 obj로 처리합니다. 직접 글꼴이 없는 텍스트 run은 상속 글꼴을 지우지 않으며, 동아시아 글꼴이 없으면 명시된 라틴 글꼴을 사용합니다.

## 외부 근거와 적용 범위

2026-09-15 확인. 공개 이슈의 제안은 현재 저장소 코드 및 재현 테스트로 확인한 뒤 적용합니다.

| 근거 | 확인 내용 | 방어 |
| --- | --- | --- |
| [python-pptx 표 동작 문서](https://python-pptx.readthedocs.io/en/latest/dev/analysis/tbl-table.html#table-width-and-column-widths) | 표 너비·높이는 열 너비·행 높이 합계와 연동 | 그리드 기반 미리보기와 선택 영역, 비균등 열 및 병합 셀 테스트 |
| [python-pptx 자리표시자 상속](https://python-pptx.readthedocs.io/en/latest/dev/analysis/placeholders/slide-placeholders/index.html#behaviors) | 슬라이드는 레이아웃의 idx 값으로 상속 | 동일 유형의 여러 텍스트 상자 서식 분리 |
| [Microsoft TableCell](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.tablecell?view=openxml-3.0.1) | hMerge/vMerge는 불리언이며 gridSpan/rowSpan과 구분 | `1`과 `true` 병합 속성 지원, 가로·세로 병합 검증 |
| [pptx-preview #14](https://github.com/501351981/pptx-preview/issues/14) | 강제 줄바꿈이 undefined 문자열로 표시된 보고 | 기존 br 렌더링 방어를 회귀 테스트로 고정 |
| [pptx-preview #15](https://github.com/501351981/pptx-preview/issues/15) | 빈 텍스트가 객체 문자열로 표시된 보고 | 기존 문자열 타입 검사를 회귀 테스트로 고정 |

단일 열은 벤더 XML 파서에서 배열 대신 객체가 되므로, 그리드 보정 시 두 형식을 모두 받습니다. 입력 파일을 외부 서비스로 보내거나 글꼴을 내려받지 않습니다. 보정은 최초 렌더링에 수행하고 이동·실행 취소는 기존 캐시를 사용합니다.

## 검증 방법과 한계

### 바로 열어볼 수 있는 테스트 PPTX

```bash
npm run fixtures:preview-format
npm run test:preview-format-fixtures
```

첫 명령은 `artifacts/preview-format-fixtures/`에 개별 PPTX 10개와 통합 PPTX 1개를 생성합니다. 두 번째 명령은 빌드·재생성 후 **디스크에 저장된 파일 자체**를 Chrome에서 읽어 검사합니다. 전체 `npm run test:browser`에도 같은 검사를 등록했습니다. 새 외부 라이브러리는 사용하지 않습니다.

| 파일 | 재현 조건 |
| --- | --- |
| `00-all-known-cases.pptx` | 아래 10개 케이스를 한 장씩 담은 통합 파일 |
| `01-table-normal.pptx` | 정상 표 크기·비균등 열 기준 |
| `02-table-stale-extents.pptx` | 외곽 크기와 그리드 합계 불일치 |
| `03-table-single-cell.pptx` | 단일 행·단일 열 |
| `04-table-merge-one.pptx` | 가로·세로 병합 속성 `1` |
| `05-table-merge-true.pptx` | 가로·세로 병합 속성 `true` |
| `06-placeholder-index.pptx` | 같은 유형, 서로 다른 자리표시자 번호 |
| `07-placeholder-default-zero.pptx` | 번호 생략과 명시적인 0 |
| `08-text-line-breaks.pptx` | 텍스트 상자와 표 셀의 강제 줄바꿈 |
| `09-text-empty-runs.pptx` | 빈 태그·자기 닫힘 태그·텍스트 태그 생략 |
| `10-text-font-inheritance.pptx` | 상속 글꼴·직접 지정 글꼴·라틴 전용 글꼴 |

출력 폴더의 `README.md`와 `manifest.json`에 기대 결과가 기록됩니다. 자동 실행 후 `results.json` 및 개별 케이스의 PNG 스크린샷도 저장됩니다. 자동 검증 범위는 모든 XML 파트 파싱과 내부 관계 연결, 실제 렌더링 크기·서식, 이동·실행 취소, 편집본 재열기, 실행 취소 후 모든 패키지 파트의 바이트 보존입니다. 통합 파일은 앱의 일반 파일 열기 경로로도 검증합니다.

테스트용 본문은 합성 데이터이며 원본 고객 파일을 포함하지 않습니다. 생성기와 검증 코드는 저장소에 남고, PPTX·결과·스크린샷은 재생성할 수 있는 산출물이므로 Git에서 제외됩니다. PowerPoint 자체에서 복구 대화상자 없이 열리는지와 원본 픽셀 일치는 이 테스트의 검증 범위 밖입니다.

```bash
npm run build
npm test
npm run test:browser
npm run test:browser -- --check-preview-format
```

합성 테스트는 `/tests/preview-format.html`에 있습니다. 제공된 재현 파일이 로컬에 있을 때 두 번째 슬라이드의 표 86과 텍스트 83/85를 추가로 검증하려면 다음 명령을 사용합니다. 이 옵션은 해당 재현 파일용이며 임의의 PPTX 검사기가 아닙니다.

```bash
PREVIEW_FORMAT_SOURCE='/네트워크 구성 참고.pptx' npm run test:browser -- --check-preview-format
```

스크린샷은 무시되는 `artifacts/preview-format.png`에 저장합니다. 원본 PPTX와 고객 내용은 테스트 fixture에 포함하지 않습니다. 테스트 환경에 나눔고딕 및 한국어 대체 글꼴이 없으므로 실제 글리프와 줄바꿈의 원본 일치 여부는 해당 글꼴이 설치된 환경에서 추가 확인해야 합니다. HTML 표의 내용이 행 높이보다 크면 브라우저가 행을 늘릴 수 있으며, 모든 PowerPoint 효과·글꼴·표 레이아웃의 픽셀 일치를 보장하지 않습니다.
