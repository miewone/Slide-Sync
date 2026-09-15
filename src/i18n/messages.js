/** All application-owned UI text. Keep Korean/English placeholders identical. */
export const messages = {
  'drive.typeError': {ko:'PPTX 또는 Google Slides 파일을 선택해 주세요.',en:'Choose a PPTX or Google Slides file.'},
  "drive.configMissing": {"ko": "Google Drive 연동 설정이 없습니다. 배포 환경에 Google OAuth 클라이언트 ID, API 키, 프로젝트 번호를 설정해 주세요.", "en": "Google Drive is not configured. Set the Google OAuth client ID, API key and project number in the deployment environment."},
  "drive.libraryError": {"ko": "Google 라이브러리를 불러오지 못했습니다. 연결을 확인하고 다시 열어 주세요.", "en": "Could not load Google libraries. Check your connection and reopen this dialog."},
  "drive.authError": {"ko": "Google 연결이 취소되었거나 파일 접근 권한을 받지 못했습니다.", "en": "Google connection was cancelled or file access was not granted."},
  "drive.expired": {"ko": "Google 연결이 만료되었습니다. Google 연결 버튼으로 다시 연결해 주세요.", "en": "Google authorization expired. Use Connect Google to reconnect."},
  "drive.networkError": {"ko": "Google에 연결하지 못했습니다. 편집 내용은 이 탭에 유지됩니다.", "en": "Could not reach Google. Your edits remain in this tab."},
  "drive.uncertain": {"ko": "저장 결과를 확인하지 못했습니다. 다시 저장하기 전에 Google Drive에서 결과를 확인해 주세요. 편집 내용은 유지됩니다.", "en": "The save result is unknown. Check Google Drive before saving again. Your edits are retained."},
  "drive.conflict": {"ko": "열었던 문서가 변경되었습니다. 편집 내용을 확인한 뒤 문서를 다시 열어 주세요. 원본에 덮어쓰지 않았습니다.", "en": "The source document has changed. Review your edits and reopen it. The original was not overwritten."},
  "drive.forbidden": {"ko": "이 작업에 필요한 파일 권한이 없거나 Google 요청 한도에 도달했습니다.", "en": "File permission is missing or a Google request limit was reached."},
  "drive.apiError": {"ko": "Google 요청에 실패했습니다 (HTTP {status}). 편집 내용은 유지됩니다.", "en": "Google request failed (HTTP {status}). Your edits are retained."},
  "drive.noEtag": {"ko": "원본의 변경 여부를 안전하게 검사할 수 없습니다. 새 파일로 저장해 주세요.", "en": "Cannot safely check the original for concurrent changes. Save as a new file."},
  "drive.noRevision": {"ko": "문서 버전을 확인할 수 없습니다. 문서를 다시 열고 저장해 주세요.", "en": "Cannot verify the document revision. Reopen the document before saving."},
  "drive.uploadError": {"ko": "Google 업로드 주소를 확인하지 못했습니다.", "en": "Could not verify the Google upload URL."},
  "drive.invalidSave": {"ko": "저장 이름, 형식 또는 파일 크기를 확인해 주세요.", "en": "Check the save name, format or file size."},
  "drive.invalidSlides": {"ko": "지원하는 문서 크기는 1–120장입니다. Google Slides 문서 구조와 크기를 확인해 주세요.", "en": "Documents must contain 1–120 slides. Check the Google Slides document structure and dimensions."},
  "drive.coordinates": {"ko": "올바른 숫자 좌표를 입력해 주세요.", "en": "Enter valid numeric coordinates."},
  "drive.previewError": {"ko": "저장본 미리보기를 불러오지 못했습니다. 아래 편집 배치와 요소 목록은 사용할 수 있습니다.", "en": "Could not load the saved preview. The draft layout and element list are still available."},
  "drive.save": {"ko": "Drive에 저장", "en": "Save to Drive"},
  "drive.destination": {"ko": "저장 방식", "en": "Save destination"},
  "drive.original": {"ko": "원본에 저장", "en": "Save to original"},
  "drive.copy": {"ko": "새 파일로 저장", "en": "Save as a new file"},
  "drive.name": {"ko": "파일 이름", "en": "File name"},
  "drive.folder": {"ko": "저장 폴더", "en": "Destination folder"},
  "drive.myDrive": {"ko": "내 드라이브", "en": "My Drive"},
  "drive.chooseFolder": {"ko": "폴더 선택", "en": "Choose folder"},
  "drive.cancel": {"ko": "취소", "en": "Cancel"},
  "drive.working": {"ko": "처리 중…", "en": "Working…"},
  "drive.privacy": {"ko": "선택한 PPTX·Google Slides를 Google에서 읽고, 저장 버튼을 누르면 선택한 위치에 저장합니다. 접근 토큰은 현재 탭의 메모리에만 보관합니다.", "en": "Selected PPTX and Google Slides files are read from Google and saved to your chosen destination when you press Save. Access tokens stay in this tab’s memory."},
  "drive.saved": {"ko": "저장되었습니다.", "en": "Saved."},
  "drive.connect": {"ko": "Google 연결", "en": "Connect Google"},
  "drive.open": {"ko": "Drive에서 열기", "en": "Open from Drive"},
  "drive.savePptx": {"ko": "현재 PPTX 저장", "en": "Save current PPTX"},
  "drive.disconnect": {"ko": "연결 해제", "en": "Disconnect"},
  "drive.close": {"ko": "닫기", "en": "Close"},
  "drive.nativeHelp": {"ko": "Google Slides 원본 객체를 직접 편집합니다. 이동·정렬·간격 균등·삭제를 지원하며, 그룹은 하나의 객체로 유지합니다. 저장 전 변경은 이 탭에만 보관됩니다. 안내선·텍스트 높이 맞춤은 현재 Slides 화면에서 지원하지 않습니다.", "en": "Edit native Google Slides objects: move, align, distribute and delete. Groups stay intact. Unsaved edits remain in this tab. Guides and text-height fitting are currently unavailable in this Slides workspace."},
  "drive.pending": {"ko": "저장 전 변경: {count}개 객체", "en": "Pending changes: {count} objects"},
  "drive.selected": {"ko": "적용 대상 선택: {count}개", "en": "Selected in scope: {count}"},
  "drive.copyCreated": {"ko": "복사본은 생성되었지만 변경 적용을 완료하지 못했습니다. 다음 파일을 확인해 주세요.", "en": "A copy was created, but applying edits did not complete. Check this file:"},
  "drive.discard": {"ko": "저장하지 않은 Google Slides 변경을 버리고 닫을까요?", "en": "Discard unsaved Google Slides edits and close?"},
  "drive.undo": {"ko": "실행 취소", "en": "Undo"},
  "drive.redo": {"ko": "다시 실행", "en": "Redo"},
  "drive.scope": {"ko": "적용할 슬라이드", "en": "Slides to edit"},
  "drive.all": {"ko": "전체 선택", "en": "Select all"},
  "drive.none": {"ko": "전체 해제", "en": "Clear all"},
  "drive.checkSlide": {"ko": "{n}번 슬라이드 적용", "en": "Include slide {n}"},
  "drive.slide": {"ko": "슬라이드", "en": "Slide"},
  "drive.slidePreview": {"ko": "{n}번 슬라이드 저장본 미리보기", "en": "Saved preview of slide {n}"},
  "drive.savedPreview": {"ko": "Google에 저장된 모습", "en": "Saved Google preview"},
  "drive.draftLayout": {"ko": "저장 전 편집 배치", "en": "Draft layout"},
  "drive.layoutHelp": {"ko": "요소를 클릭해 선택합니다. 배치는 위치·크기를 보여주며, 서식은 위 저장본에서 확인합니다. 점선은 변경된 요소입니다. 저장하면 실행 취소 기록이 초기화됩니다.", "en": "Click objects to select them. This layout shows positions and sizes; use the saved preview above to inspect formatting. Dashed outlines mark changed objects. Saving resets undo history."},
  "drive.edit": {"ko": "요소 편집", "en": "Edit objects"},
  "drive.search": {"ko": "이름·문자열 검색", "en": "Search names and text"},
  "drive.selectMatches": {"ko": "체크한 슬라이드의 검색 결과 선택", "en": "Select matches in checked slides"},
  "drive.clearSelection": {"ko": "요소 선택 비우기", "en": "Clear object selection"},
  "drive.deleted": {"ko": "삭제 예정", "en": "Pending deletion"},
  "drive.moveMode": {"ko": "이동 방식", "en": "Move mode"},
  "drive.relative": {"ko": "현재 위치에서 이동", "en": "Move relative to current position"},
  "drive.absolute": {"ko": "선택 영역의 좌상단 좌표", "en": "Position selection’s top-left corner"},
  "drive.move": {"ko": "이동 적용", "en": "Apply move"},
  "drive.align": {"ko": "선택 영역 기준 정렬", "en": "Align within selection"},
  "drive.left": {"ko": "왼쪽", "en": "Left"},
  "drive.center": {"ko": "가로 가운데", "en": "Center"},
  "drive.right": {"ko": "오른쪽", "en": "Right"},
  "drive.top": {"ko": "위쪽", "en": "Top"},
  "drive.middle": {"ko": "세로 가운데", "en": "Middle"},
  "drive.bottom": {"ko": "아래쪽", "en": "Bottom"},
  "drive.horizontal": {"ko": "가로 간격 균등", "en": "Distribute horizontally"},
  "drive.vertical": {"ko": "세로 간격 균등", "en": "Distribute vertically"},
  "drive.delete": {"ko": "선택한 요소 삭제", "en": "Delete selected objects"},

  'activity.title': {ko:'작업 로그',en:'Activity log'},
  'activity.open': {ko:'작업 로그 열기 · {count}개',en:'Open activity log · {count} entries'},
  'activity.count': {ko:'총 {count}개',en:'{count} total'},
  'activity.close': {ko:'작업 로그 닫기',en:'Close activity log'},
  'activity.clear': {ko:'로그 비우기',en:'Clear log'},
  'activity.empty': {ko:'아직 기록된 작업이 없습니다.',en:'No activity recorded yet.'},
  'activity.help': {ko:'최근 {limit}개를 표시합니다. 이 탭에서만 보관하며 새로고침하면 초기화됩니다.',en:'Showing the latest {limit} entries. Kept in this tab only and cleared on reload.'},
  'activity.level.info': {ko:'안내',en:'Info'},
  'activity.level.success': {ko:'완료',en:'Success'},
  'activity.level.warning': {ko:'확인 필요',en:'Warning'},
  'activity.level.error': {ko:'실패',en:'Error'},
  'activity.message': {ko:'{message}',en:'{message}'},
  'activity.error': {ko:'작업 실패: {message}',en:'Operation failed: {message}'},
  'activity.opening': {ko:'PPTX 파일을 열고 있습니다.',en:'Opening PPTX file.'},
  'activity.opened': {ko:'PPTX {slides}개 슬라이드를 열었습니다.',en:'Opened {slides} PPTX slides.'},
  'activity.webFonts': {ko:'원본과 같은 무료 웹폰트 {count}개 사용: {names}',en:'Using {count} matching free web fonts: {names}'},
  'activity.fontUnavailable': {ko:'원본 글꼴 확인 필요: {font}',en:'Original font needs attention: {font}'},
  'activity.fontFailed': {ko:'글꼴 로딩 실패: {font} · {reason}',en:'Font loading failed: {font} · {reason}'},
  'activity.fontStarting': {ko:'글꼴 적용 시작: {font}',en:'Applying font: {font}'},
  'activity.fontApplied': {ko:'글꼴 적용 완료: {font} → {target} · {slides}개 슬라이드',en:'Font applied: {font} → {target} · {slides} slides'},
  'activity.fontScanStarting': {ko:'설치된 원본 글꼴을 확인하고 있습니다.',en:'Checking installed original fonts.'},
  'activity.fontScanDone': {ko:'설치 글꼴 확인 완료 · 확인이 필요한 글꼴 {remaining}개',en:'Installed-font check complete · {remaining} fonts still need attention'},
  'activity.previewFallback': {ko:'렌더링되지 않은 {slides}개 슬라이드는 간이 미리보기로 표시했습니다.',en:'Used simplified previews for {slides} slides that could not be rendered.'},
  'activity.edited': {ko:'{slides}개 슬라이드 편집',en:'Edited {slides} slides'},
  'activity.moved': {ko:'{slides}개 슬라이드의 요소 이동',en:'Moved elements on {slides} slides'},
  'activity.aligned': {ko:'{slides}개 슬라이드의 요소 정렬',en:'Aligned elements on {slides} slides'},
  'activity.formatted': {ko:'{slides}개 슬라이드의 텍스트 서식 변경',en:'Changed text formatting on {slides} slides'},
  'activity.fitted': {ko:'{slides}개 슬라이드의 텍스트 상자 맞춤',en:'Fitted text boxes on {slides} slides'},
  'activity.guides': {ko:'안내선 변경',en:'Changed guides'},
  'activity.deleted': {ko:'요소 {count}개 삭제',en:'Deleted {count} elements'},
  'activity.undo': {ko:'마지막 편집 실행 취소',en:'Undid the last edit'},
  'activity.redo': {ko:'편집 다시 실행',en:'Redid the edit'},
  'activity.exported': {ko:'수정본 다운로드 준비 완료',en:'Edited PPTX is ready to download'},
  'activity.aiApplied': {ko:'AI 수정안을 {slides}개 슬라이드에 적용',en:'Applied AI edits to {slides} slides'},
  'storage.saving': {ko:'최근 파일·미리보기 보관 중…',en:'Saving recent files and previews…'},
  "appearance.settings": {"ko": "일치 조건 선택", "en": "Choose matching criteria"},
  "appearance.close": {"ko": "닫기", "en": "Close"},
  "appearance.description": {"ko": "체크한 조건을 모두 만족하는 요소만 다음 클릭·영역 선택에서 선택합니다.", "en": "Subsequent clicks and box selections require all checked criteria to match."},
  "appearance.size": {"ko": "크기 · 너비와 높이", "en": "Size · width and height"},
  "appearance.colors": {"ko": "색상 · 채우기, 테두리, 글자색", "en": "Colors · fill, outline and text"},
  "appearance.layout": {"ko": "레이아웃 · 위치, 회전, 그룹 내부 배치", "en": "Layout · position, rotation and group arrangement"},
  "appearance.empty": {"ko": "모두 해제하면 일치 조건 없이 선택합니다. 기존 선택은 유지됩니다.", "en": "Uncheck all to select without matching criteria. Existing selections are preserved."},
  "appearance.changed": {"ko": "일치 조건을 변경했습니다. 다음 클릭·영역 선택부터 적용됩니다.", "en": "Matching criteria updated for subsequent clicks and box selections."},

  'history.title': {ko:'삭제·실행 취소·다시 실행',en:'Delete, undo and redo'},
  'history.redo': {ko:'↷ 다시 실행',en:'↷ Redo'},
  'history.redone': {ko:'변경을 다시 실행했습니다.',en:'Change redone.'},
  'textFormat.title': {ko:'텍스트 서식',en:'Text formatting'},
  'textFormat.empty': {ko:'텍스트 박스를 선택하세요.',en:'Select a text box.'},
  'textFormat.count': {ko:'체크된 슬라이드의 선택한 텍스트 박스 {count}개 전체에 적용합니다.',en:'Applies to all text in {count} selected boxes on checked slides.'},
  'textFormat.size': {ko:'글자 크기 (pt)',en:'Font size (pt)'},
  'textFormat.decrease': {ko:'글자 크기 줄이기',en:'Decrease font size'},
  'textFormat.increase': {ko:'글자 크기 키우기',en:'Increase font size'},
  'textFormat.sizeHelp': {ko:'글자 크기 (pt) · 입력 후 Enter 또는 포커스를 옮기면 적용',en:'Font size (pt) · press Enter or leave the field to apply'},
  'textFormat.bold': {ko:'볼드',en:'Bold'},
  'textFormat.normal': {ko:'볼드 해제',en:'Remove bold'},
  'textFormat.mixed': {ko:'혼합 또는 상속',en:'Mixed or inherited'},
  'textFormat.invalid': {ko:'글자 크기는 1~400pt 사이로 입력하세요.',en:'Enter a font size between 1 and 400 pt.'},
  'textFormat.done': {ko:'텍스트 박스 {count}개의 서식을 적용했습니다.',en:'Formatted {count} text boxes.'},
  'fonts.title': {ko:'글꼴',en:'Fonts'},
  'fonts.apply': {ko:'적용하기',en:'Apply'},
  'fonts.applyingShort': {ko:'적용 중…',en:'Applying…'},
  'fonts.pendingChoice': {ko:'{name} 선택됨 · 적용하기를 눌러 주세요.',en:'{name} selected · Click Apply.'},
  'fonts.browserFallback': {ko:'현재: 브라우저 대체 표시 · 글꼴을 선택하고 적용하기를 눌러 주세요.',en:'Currently using browser fallback · Choose a font and click Apply.'},
  'fonts.complete': {ko:'글꼴 적용 완료',en:'Fonts applied'},
  'fonts.applying': {ko:'선택한 글꼴을 불러와 적용하고 있습니다…',en:'Loading and applying the selected font…'},
  'fonts.allApplied': {ko:'필요한 글꼴 적용을 완료했습니다. 창을 닫으면 글꼴 확인 버튼도 사라집니다.',en:'All required font choices are applied. Closing this panel also hides the font warning button.'},
  'fonts.trigger': {ko:'글꼴 확인 {count}',en:'Check fonts {count}'},
  'fonts.close': {ko:'글꼴 창 닫기',en:'Close font panel'},
  'fonts.summary': {ko:'원본 우선 · {count}개',en:'Original first · {count} families'},
  'fonts.unresolved': {ko:'확인 필요 {count}개',en:'{count} need attention'},
  'fonts.policy': {ko:'사용 가능한 내장 글꼴 → 설치된 원본 → 동일한 무료 웹폰트 순으로 찾습니다. 대체 글꼴은 직접 선택할 때만 적용하며, 원본 PPTX와 편집 기록은 바꾸지 않습니다.',en:'Use a supported embedded font, then the installed original, then the same free web font. Substitutions require your choice. The PPTX and edit history stay unchanged.'},
  'fonts.search': {ko:'문서 글꼴 검색',en:'Search document fonts'},
  'fonts.localAccess': {ko:'설치 글꼴 확인',en:'Check installed fonts'},
  'fonts.slides': {ko:'{count}개 슬라이드',en:'{count} slides'},
  'fonts.choose': {ko:'{name} 글꼴 설정',en:'Font setting for {name}'},
  'fonts.original': {ko:'원본 글꼴 우선',en:'Original font first'},
  'fonts.uploaded': {ko:'불러온 글꼴 파일',en:'Imported font file'},
  'fonts.file': {ko:'글꼴 파일',en:'Font file'},
  'fonts.fileFor': {ko:'{name}에 사용할 글꼴 파일',en:'Font file for {name}'},
  'fonts.catalogue': {ko:'제공하는 무료 글꼴',en:'Available free fonts'},
  'fonts.applied': {ko:'적용',en:'Applied'},
  'fonts.retry': {ko:'다시 확인',en:'Retry'},
  'fonts.empty': {ko:'PPTX를 열면 사용한 글꼴과 적용 상태를 표시합니다.',en:'Open a PPTX to see its original fonts and their status.'},
  'fonts.noMatches': {ko:'일치하는 문서 글꼴이 없습니다.',en:'No matching document fonts.'},
  'fonts.synthetic': {ko:'일부 굵기·기울임은 브라우저가 보완합니다.',en:'Some weights or italics are synthesized by the browser.'},
  'fonts.status.pending': {ko:'확인 중',en:'Checking'},
  'fonts.status.local': {ko:'설치된 원본 사용',en:'Installed original'},
  'fonts.status.embedded': {ko:'PPTX 내장 원본 사용',en:'PPTX embedded original'},
  'fonts.embeddedUnsupported': {ko:'내장 글꼴을 브라우저가 읽지 못했습니다. 동일한 설치 글꼴이나 글꼴 파일을 사용할 수 있습니다.',en:'The embedded font could not be read by the browser. Use the same installed font or a font file.'},
  'fonts.status.web': {ko:'동일한 무료 글꼴 사용',en:'Same free font'},
  'fonts.status.replacement': {ko:'선택한 대체 글꼴 사용',en:'Chosen substitute'},
  'fonts.status.uploaded': {ko:'불러온 파일 사용',en:'Imported font'},
  'fonts.status.unavailable': {ko:'원본 확인 불가 · 브라우저 대체 표시',en:'Original unverified · browser fallback'},
  'fonts.status.failed': {ko:'글꼴 로딩 실패 · 원본 설정 유지',en:'Font loading failed · original setting retained'},
  'fonts.error': {ko:'글꼴을 불러오지 못했습니다. 32MB 이하의 TTF·OTF·WOFF·WOFF2 파일을 선택하거나 다시 시도하세요.',en:'Could not load the font. Choose a TTF, OTF, WOFF or WOFF2 file up to 32 MB, or retry.'},
  'fonts.permissionError': {ko:'설치 글꼴 접근이 허용되지 않았습니다. 글꼴 파일을 직접 선택할 수도 있습니다.',en:'Access to installed fonts was not granted. You can choose a font file instead.'},
  "ElementNamePopover.1": {
    "ko": "요소 이름 목록",
    "en": "Element names"
  },
  "ElementNamePopover.2": {
    "ko": "요소 이름 · ",
    "en": "Element names · "
  },
  "ElementNamePopover.3": {
    "ko": "요소 이름 목록 닫기",
    "en": "Close element names"
  },
  "ElementNamePopover.4": {
    "ko": "체크한 슬라이드의 요소입니다. 이름을 누르면 검색하고 일치 요소를 선택에 추가합니다.",
    "en": "Elements on checked slides. Choose a name to search and add matching elements to the selection."
  },
  "ElementNamePopover.5": {
    "ko": "슬라이드 {p0}",
    "en": "Slide {p0}"
  },
  "ElementNamePopover.6": {
    "ko": "개 · 슬라이드 ",
    "en": " items · Slides "
  },
  "ElementNamePopover.7": {
    "ko": " 외 {p0}장",
    "en": " and {p0} more slides"
  },
  "ElementNamePopover.8": {
    "ko": "표시할 요소가 없습니다. 적용할 슬라이드를 체크하세요.",
    "en": "No elements to show. Check the slides you want to use."
  },
  "ElementNamePopover.9": {
    "ko": "더 보기 (",
    "en": "Show more ("
  },
  "ElementSearchPanel.1": {
    "ko": "문자열로 요소 선택",
    "en": "Select elements by text"
  },
  "ElementSearchPanel.2": {
    "ko": "요소 이름·텍스트 검색",
    "en": "Search element names and text"
  },
  "ElementSearchPanel.3": {
    "ko": "찾을 문자열 입력",
    "en": "Enter search text"
  },
  "ElementSearchPanel.4": {
    "ko": "{p0}개 요소 · {p1}개 슬라이드 일치 · {p2}개 선택됨",
    "en": "{p0} elements · {p1} matching slides · {p2} selected"
  },
  "ElementSearchPanel.5": {
    "ko": "체크한 슬라이드에서 검색합니다. 그룹은 전체를 선택합니다.",
    "en": "Searches checked slides. Groups are selected as a whole."
  },
  "GuidePanel.1": {
    "ko": "안내선",
    "en": "Guides"
  },
  "GuidePanel.2": {
    "ko": "안내선 표시",
    "en": "Show guides"
  },
  "GuidePanel.3": {
    "ko": "이동할 때 안내선에 맞추기",
    "en": "Snap to guides when moving"
  },
  "GuidePanel.4": {
    "ko": "안내선을 드래그하여 편집",
    "en": "Drag to edit guides"
  },
  "GuidePanel.5": {
    "ko": "+ 가로 안내선",
    "en": "+ Horizontal guide"
  },
  "GuidePanel.6": {
    "ko": "+ 세로 안내선",
    "en": "+ Vertical guide"
  },
  "GuidePanel.7": {
    "ko": "파일을 열면 기존 안내선을 불러옵니다.",
    "en": "Open a file to load its existing guides."
  },
  "GuidePanel.8": {
    "ko": "안내선 선택",
    "en": "Select a guide"
  },
  "GuidePanel.9": {
    "ko": "왼쪽에서 (cm)",
    "en": "From left (cm)"
  },
  "GuidePanel.10": {
    "ko": "적용",
    "en": "Apply"
  },
  "GuidePanel.11": {
    "ko": "삭제",
    "en": "Delete"
  },
  "GuidePanel.12": {
    "ko": "마스터·레이아웃 안내선은 표시와 맞추기만 지원합니다.",
    "en": "Master and layout guides support display and snapping only."
  },
  "GuidePanel.13": {
    "ko": "공통 안내선은 모든 슬라이드에 적용되며 수정본 PPTX에도 저장됩니다. Alt를 누르고 드래그하면 안내선 맞추기를 잠시 해제합니다.",
    "en": "Shared guides apply to every slide and are saved in the edited PPTX. Hold Alt while dragging to temporarily disable snapping."
  },
  "Header.1": {
    "ko": "Slide Sync GitHub 저장소 (새 탭)",
    "en": "Slide Sync GitHub repository (new tab)"
  },
  "Header.2": {
    "ko": "Slide Sync",
    "en": "Slide Sync"
  },
  "Header.3": {
    "ko": "PPTX 편집",
    "en": "PPTX editor"
  },
  "Header.4": {
    "ko": "개발자 · dlsrk489@gmail.com",
    "en": "Developer · dlsrk489@gmail.com"
  },
  "Header.5": {
    "ko": "PPTX 열기",
    "en": "Open PPTX"
  },
  "Header.6": {
    "ko": "수정본 다운로드 ",
    "en": "Download edited PPTX "
  },
  "Help.1": {
    "ko": "선택 요소 삭제",
    "en": "Delete selected elements"
  },
  "Help.2": {
    "ko": "적용 대상으로 체크한 슬라이드에서 선택한 요소를 삭제합니다. 그룹은 통째로 삭제됩니다. Delete·Backspace 키로도 삭제할 수 있으며, 마지막 변경 취소 또는 Ctrl·Cmd+Z로 복원할 수 있습니다. 입력란에서 글자를 지울 때는 요소가 삭제되지 않습니다.",
    "en": "Deletes selected elements on checked slides. Groups are deleted as a whole. You can also press Delete or Backspace. Restore with Undo or Ctrl/Cmd+Z. Deleting text in an input field does not delete slide elements."
  },
  "Help.3": {
    "ko": "영역 선택",
    "en": "Box select"
  },
  "Help.4": {
    "ko": "요소 위에서도 드래그로 영역을 그립니다. 영역 안에 완전히 포함된 요소를 적용 대상 슬라이드에서 함께 선택합니다. Ctrl·Shift·Cmd를 누르면 기존 선택에 추가합니다.",
    "en": "Drag to draw a selection even over an element. Selects fully enclosed elements on target slides. Hold Ctrl, Shift or Cmd to add to the selection."
  },
  "Help.5": {
    "ko": "크기·색상·레이아웃 일치",
    "en": "Match size, colors and layout"
  },
  "Help.6": {
    "ko": "플로팅 박스에서 크기·색상·레이아웃을 각각 체크합니다. 다음 클릭·영역 선택부터 체크한 조건이 기준 페이지와 같은 요소만 선택합니다. 기존 선택과 문자열 검색에는 적용되지 않습니다. 원본 서식이 다르면 화면상 같아 보여도 제외될 수 있습니다.",
    "en": "Choose size, colors and layout separately in the floating panel. Subsequent clicks and box selections only select elements matching the checked criteria. Existing selections and text searches are unchanged. Different source formatting may be excluded even when it looks identical."
  },
  "Help.7": {
    "ko": "선택한 슬라이드만 보기",
    "en": "Show checked slides only"
  },
  "Help.8": {
    "ko": "왼쪽 목록에서 적용 대상으로 체크한 슬라이드만 미리보기에 표시합니다. 끄면 모든 슬라이드가 다시 보이며, 적용 대상과 요소 선택은 유지됩니다.",
    "en": "Shows only the slides checked in the left sidebar. Turn off to show all slides again. Target slides and element selections are preserved."
  },
  "Help.9": {
    "ko": "{p0} 도움말",
    "en": "Help: {p0}"
  },
  "Inspector.1": {
    "ko": "선택한 요소 편집",
    "en": "Edit selected elements"
  },
  "Inspector.2": {
    "ko": "↶ 마지막 변경 취소",
    "en": "↶ Undo last change"
  },
  "LayoutPanel.1": {
    "ko": "선택한 요소들의 영역",
    "en": "Selected elements' bounds"
  },
  "LayoutPanel.2": {
    "ko": "슬라이드 전체",
    "en": "Entire slide"
  },
  "LayoutPanel.3": {
    "ko": "선택한 요소 정렬",
    "en": "Align selected elements"
  },
  "LayoutPanel.4": {
    "ko": "정렬 기준",
    "en": "Align relative to"
  },
  "LayoutPanel.5": {
    "ko": "같은 슬라이드에서 요소를 2개 이상 선택하세요.",
    "en": "Select at least two elements on the same slide."
  },
  "LayoutPanel.6": {
    "ko": "간격 균등",
    "en": "Distribute evenly"
  },
  "LayoutPanel.7": {
    "ko": "각 슬라이드에서 3개 이상 선택하면 양 끝 요소를 유지하고 간격을 맞춥니다.",
    "en": "Select at least three elements per slide. The outermost elements stay in place."
  },
  "MovePanel.1": {
    "ko": "요소 이동",
    "en": "Move elements"
  },
  "MovePanel.2": {
    "ko": "빈 곳을 드래그하면 사각형 안에 완전히 포함된 요소를 적용 대상 슬라이드마다 선택합니다. 요소를 드래그하면 선택한 요소가 함께 이동합니다. 배경이 꽉 찬 슬라이드에서는 ‘영역 선택’을 켜세요.",
    "en": "Drag on empty space to select fully enclosed elements on each target slide. Drag an element to move the selection together. Enable Box select when a slide is covered by a background shape."
  },
  "MovePanel.3": {
    "ko": "이동 방식",
    "en": "Move mode"
  },
  "MovePanel.4": {
    "ko": "모두 같은 위치로 맞추기",
    "en": "Set the same position"
  },
  "MovePanel.5": {
    "ko": "같은 거리만큼 이동하기",
    "en": "Move by the same offset"
  },
  "MovePanel.6": {
    "ko": "선택 영역의 왼쪽 위 · 여러 요소는 간격 유지",
    "en": "Top-left of selection · Keeps spacing between elements"
  },
  "MovePanel.7": {
    "ko": "선택한 요소 이동",
    "en": "Move selected elements"
  },
  "MovePanel.8": {
    "ko": "선택·이동 단축키",
    "en": "Selection and movement shortcuts"
  },
  "MovePanel.9": {
    "ko": "빈 곳에서 드래그",
    "en": "Drag on empty space"
  },
  "MovePanel.10": {
    "ko": "사각형 범위로 선택",
    "en": "Select a rectangular area"
  },
  "MovePanel.11": {
    "ko": "Ctrl / Shift / ⌘ + 영역 드래그",
    "en": "Ctrl / Shift / ⌘ + box drag"
  },
  "MovePanel.12": {
    "ko": "기존 선택에 추가",
    "en": "Add to selection"
  },
  "MovePanel.13": {
    "ko": "Ctrl / Shift + 클릭",
    "en": "Ctrl / Shift + click"
  },
  "MovePanel.14": {
    "ko": "선택 추가·해제",
    "en": "Add to or remove from selection"
  },
  "MovePanel.15": {
    "ko": "Shift + 요소 드래그",
    "en": "Shift + element drag"
  },
  "MovePanel.16": {
    "ko": "가로·세로 방향 고정",
    "en": "Lock horizontal or vertical movement"
  },
  "MovePanel.17": {
    "ko": "방향키",
    "en": "Arrow keys"
  },
  "MovePanel.18": {
    "ko": "0.1 cm 이동",
    "en": "Move 0.1 cm"
  },
  "MovePanel.19": {
    "ko": "Shift + 방향키",
    "en": "Shift + arrow keys"
  },
  "MovePanel.20": {
    "ko": "1 cm 이동",
    "en": "Move 1 cm"
  },
  "MovePanel.21": {
    "ko": "Ctrl + 방향키",
    "en": "Ctrl + arrow keys"
  },
  "MovePanel.22": {
    "ko": "0.01 cm 이동",
    "en": "Move 0.01 cm"
  },
  "MovePanel.23": {
    "ko": "Ctrl + A / Ctrl + Z",
    "en": "Ctrl + A / Ctrl + Z"
  },
  "MovePanel.24": {
    "ko": "전체 요소 선택 / 실행 취소",
    "en": "Select all elements / Undo"
  },
  "MovePanel.25": {
    "ko": "Esc",
    "en": "Esc"
  },
  "MovePanel.26": {
    "ko": "드래그 취소·선택 해제",
    "en": "Cancel drag / Clear selection"
  },
  "MovePanel.27": {
    "ko": "방향키·전체 선택은 미리보기를 클릭한 상태에서 사용합니다. Mac에서는 Ctrl 대신 ⌘도 사용할 수 있습니다.",
    "en": "Click a preview before using arrow keys or Select all. On Mac, you can use ⌘ instead of Ctrl."
  },
  "RecentFiles.1": {
    "ko": "최근 PPTX",
    "en": "Recent PPTX"
  },
  "RecentFiles.2": {
    "ko": "최근 사용한 PPTX",
    "en": "Recently used PPTX files"
  },
  "RecentFiles.3": {
    "ko": "닫기",
    "en": "Close"
  },
  "RecentFiles.4": {
    "ko": "이 브라우저에 보관한 원본 파일입니다. 사용할 파일을 선택하세요.",
    "en": "Original files stored in this browser. Choose the file to use."
  },
  "RecentFiles.5": {
    "ko": "편집 내용은 자동 저장되지 않습니다. 수정본은 다운로드해 보관하세요.",
    "en": "Edits are not saved automatically. Download the edited file to keep your changes."
  },
  "RecentFiles.6": {
    "ko": "최근 파일을 처리하고 있습니다…",
    "en": "Processing recent files…"
  },
  "RecentFiles.7": {
    "ko": "{p0}개 파일 보관 중",
    "en": "{p0} files stored"
  },
  "RecentFiles.8": {
    "ko": "아직 보관한 파일이 없습니다. PPTX를 열면 이 목록에 추가됩니다.",
    "en": "No files stored yet. Opening a PPTX adds it to this list."
  },
  "RecentFiles.9": {
    "ko": " MB · ",
    "en": " MB · "
  },
  "RecentFiles.10": {
    "ko": "{p0} 보관 삭제",
    "en": "Remove stored file: {p0}"
  },
  "RecentFiles.11": {
    "ko": "브라우저를 닫아도 유지됩니다. 사이트 데이터를 지우거나 브라우저가 저장 공간을 정리하면 삭제될 수 있습니다.",
    "en": "Files remain after you close the browser. Clearing site data or browser storage cleanup can remove them."
  },
  "RecentFiles.12": {
    "ko": "전체 삭제",
    "en": "Delete all"
  },
  "SearchSelection.1": {
    "ko": "파일을 열면 검색할 수 있습니다.",
    "en": "Open a file to search."
  },
  "SearchSelection.2": {
    "ko": "검색어를 입력하세요.",
    "en": "Enter a search term."
  },
  "SearchSelection.3": {
    "ko": "일치 선택",
    "en": "Select matches"
  },
  "SearchSelection.4": {
    "ko": "일치 해제",
    "en": "Deselect matches"
  },
  "SearchSelection.5": {
    "ko": "대소문자 구분 없이 검색합니다.",
    "en": "Search is case-insensitive."
  },
  "SearchSelection.6": {
    "ko": "Enter: 선택 · Shift+Enter: 해제",
    "en": "Enter: select · Shift+Enter: deselect"
  },
  "SearchSelection.7": {
    "ko": "↓: 요소 이름 목록 · Esc: 목록 닫기",
    "en": "↓: element names · Esc: close list"
  },
  "Selection.1": {
    "ko": "개 요소 · ",
    "en": " elements · "
  },
  "Selection.2": {
    "ko": "개 슬라이드",
    "en": " slides"
  },
  "Selection.3": {
    "ko": "슬라이드에서 요소를 클릭하세요.",
    "en": "Click an element on a slide."
  },
  "SelectionPanel.1": {
    "ko": "선택 결과",
    "en": "Selection results"
  },
  "SelectionPanel.2": {
    "ko": "비우기",
    "en": "Clear"
  },
  "SelectionPanel.3": {
    "ko": "미리보기 안내",
    "en": "About the preview"
  },
  "SelectionPanel.4": {
    "ko": "브라우저 미리보기는 PowerPoint와 글꼴·효과가 다를 수 있습니다. 원본 파일에서 선택한 요소의 위치·텍스트 상자 높이 변경과 삭제 결과를 저장합니다. 클릭 판정은 요소의 회전된 사각 영역 기준입니다. 그룹은 한 단위로 이동하며 배경과 마스터 요소는 편집 대상에서 제외됩니다.",
    "en": "Browser previews may differ from PowerPoint in fonts and effects. Position changes, text-box height changes and deletions are saved to the original PPTX structure. Hit testing uses each element's rotated rectangle. Groups move as one unit; backgrounds and master elements are excluded from editing."
  },
  "Sidebar.1": {
    "ko": "일치",
    "en": "Match"
  },
  "Sidebar.2": {
    "ko": "슬라이드",
    "en": "Slides"
  },
  "Sidebar.3": {
    "ko": "전체 선택",
    "en": "Select all"
  },
  "Sidebar.4": {
    "ko": "선택 해제",
    "en": "Deselect all"
  },
  "Sidebar.5": {
    "ko": "번호로 선택",
    "en": "Select by number"
  },
  "Sidebar.6": {
    "ko": "예: 1, 3–5",
    "en": "Example: 1, 3–5"
  },
  "Sidebar.7": {
    "ko": "적용할 슬라이드 번호",
    "en": "Target slide numbers"
  },
  "Sidebar.8": {
    "ko": "파일을 열면 슬라이드가 표시됩니다.",
    "en": "Open a file to display its slides."
  },
  "Sidebar.9": {
    "ko": "체크한 슬라이드에 함께 적용됩니다.",
    "en": "Changes apply to all checked slides."
  },
  "SlideSearch.1": {
    "ko": "문자열로 선택",
    "en": "Select by text"
  },
  "SlideSearch.2": {
    "ko": "제목·본문 검색",
    "en": "Search titles and body text"
  },
  "SlideSearch.3": {
    "ko": "{p0}개 일치 · {p1}개 선택됨",
    "en": "{p0} matches · {p1} selected"
  },
  'textFit.widthScope': {ko:'가로 맞춤 대상',en:'Width fit scope'},
  'textFit.background': {ko:'투명·흰색 배경만',en:'Transparent or white fill only'},
  'textFit.unwrap': {ko:'가로 맞춤 시 자동 줄바꿈 풀기',en:'Remove automatic wrapping when fitting width'},
  'textFit.width': {ko:'텍스트에 맞게 가로 조정',en:'Fit text box width'},
  'textFit.widthHelp': {ko:'자동 줄바꿈 풀기를 끄면 현재 줄바꿈을 유지하고, 켜면 직접 입력한 줄바꿈만 유지합니다.',en:'Keep current wrapping when off; keep only explicit line breaks when on.'},
  'textFit.widthDone': {ko:'텍스트 상자 {p0}개의 가로를 내용에 맞췄습니다.{p1}',en:'Fitted the width of {p0} text boxes.{p1}'},
  "TextFitPanel.1": {
    "ko": "텍스트 상자 맞춤",
    "en": "Fit text boxes"
  },
  "TextFitPanel.2": {
    "ko": "원래 글자 크기와 너비를 유지하고, 높이를 내용에 맞게 늘리거나 줄입니다.",
    "en": "Grow or shrink the height to fit the text, keeping the original font size and width."
  },
  "TextFitPanel.3": {
    "ko": "맞춤 대상",
    "en": "Fit scope"
  },
  "TextFitPanel.4": {
    "ko": "적용 슬라이드의 모든 텍스트 상자",
    "en": "All text boxes on target slides"
  },
  "TextFitPanel.5": {
    "ko": "현재 선택한 텍스트 상자",
    "en": "Selected text boxes"
  },
  "TextFitPanel.6": {
    "ko": "대상 텍스트 상자 없음",
    "en": "No target text boxes"
  },
  "TextFitPanel.7": {
    "ko": "텍스트에 맞게 높이 조정",
    "en": "Fit height to text"
  },
  "TextFitPanel.8": {
    "ko": "제목 포함 · 그룹 안 텍스트, 세로쓰기, 다단 텍스트 제외",
    "en": "Includes titles · Excludes grouped text, vertical writing and multicolumn text"
  },
  "Workspace.1": {
    "ko": "예제 슬라이드 사용해보기",
    "en": "Try the example slides"
  },
  "Workspace.2": {
    "ko": "내 PPTX 파일 열기",
    "en": "Open my PPTX file"
  },
  "Workspace.3": {
    "ko": "처음이라면 예제로 시작하세요",
    "en": "New here? Start with an example"
  },
  "Workspace.4": {
    "ko": "슬라이드 편집, 바로 경험해 보세요",
    "en": "Try editing slides right away"
  },
  "Workspace.5": {
    "ko": "PPTX 파일을 여기에 놓으세요",
    "en": "Drop your PPTX file here"
  },
  "Workspace.6": {
    "ko": "파일 없이도 예제로 시작할 수 있어요.",
    "en": "Start with an example—no file needed."
  },
  "Workspace.7": {
    "ko": "여러 슬라이드의 요소를 함께 선택하고, 옮기고, 삭제해 보세요.",
    "en": "Select, move and delete elements across multiple slides."
  },
  "Workspace.8": {
    "ko": "여러 슬라이드의 같은 좌표를 클릭하고",
    "en": "Click the same position on multiple slides"
  },
  "Workspace.9": {
    "ko": "선택된 요소를 함께 옮길 수 있습니다.",
    "en": "and move the selected elements together."
  },
  "Workspace.10": {
    "ko": "내 PPTX 파일을 이곳에 끌어 놓아도 됩니다.",
    "en": "You can also drag your own PPTX file here."
  },
  "Workspace.11": {
    "ko": "파일은 브라우저 안에서 처리됩니다.",
    "en": "Files are processed in your browser."
  },
  "EditorStore.1": {
    "ko": "슬라이드 일괄 이동",
    "en": "Move elements across slides"
  },
  "EditorStore.2": {
    "ko": "PPTX 파일을 열어 시작하세요.",
    "en": "Open a PPTX file to get started."
  },
  "EditorStore.3": {
    "ko": "같은 위치의 요소를 한 번에 선택하세요.",
    "en": "Select elements at the same position in one go."
  },
  "ElementDeletion.1": {
    "ko": "삭제할 요소의 원본을 찾지 못했습니다.",
    "en": "The source of an element to delete could not be found."
  },
  "SelectionLabel.1": {
    "ko": "요소 {p0}",
    "en": "Element {p0}"
  },
  "SelectionLabel.2": {
    "ko": "{p0} 외 {p1}개",
    "en": "{p0} and {p1} more"
  },
  "SelectionLabel.3": {
    "ko": "선택된 요소: {p0}",
    "en": "Selected elements: {p0}"
  },
  "core.1": {
    "ko": "외부 엔터티가 포함된 XML은 지원하지 않습니다.",
    "en": "XML containing external entities is not supported."
  },
  "core.2": {
    "ko": "PPTX의 XML을 읽을 수 없습니다.",
    "en": "Could not read the PPTX XML."
  },
  "core.xmlParseError": {
    "ko": "PPTX의 XML을 읽을 수 없습니다. 내부 파일: {path} · 상세: {detail}",
    "en": "Could not read the PPTX XML. Package part: {path} · Details: {detail}"
  },
  "core.xmlUnknownPart": {
    "ko": "경로 정보 없음",
    "en": "Path unavailable"
  },
  "core.xmlEncoding": {
    "ko": "지원하지 않는 XML 인코딩입니다. 내부 파일: {path} · 인코딩: {encoding}",
    "en": "Unsupported XML encoding. Package part: {path} · Encoding: {encoding}"
  },
  "core.xmlEncodingMismatch": {
    "ko": "XML 인코딩 선언과 바이트 형식이 다릅니다. 내부 파일: {path} · 선언: {encoding} · 감지: {detected}",
    "en": "XML encoding declaration conflicts with its bytes. Package part: {path} · Declared: {encoding} · Detected: {detected}"
  },
  "core.xmlInvalidBytes": {
    "ko": "XML에 올바르지 않은 인코딩 바이트가 있습니다. 내부 파일: {path} · 인코딩: {encoding}",
    "en": "Invalid encoded bytes in XML. Package part: {path} · Encoding: {encoding}"
  },
  "core.3": {
    "ko": "이름 없는 요소",
    "en": "Unnamed element"
  },
  "core.4": {
    "ko": "구성 파일이 너무 많은 PPTX입니다.",
    "en": "This PPTX contains too many package files."
  },
  "core.5": {
    "ko": "압축 해제 크기가 300MB를 넘습니다. 파일을 나누어 열어주세요.",
    "en": "Uncompressed size exceeds 300 MB. Split the file and try again."
  },
  "core.6": {
    "ko": "일반 PPTX 파일을 선택하세요. 암호가 설정된 파일은 지원하지 않습니다.",
    "en": "Choose a standard PPTX file. Password-protected files are not supported."
  },
  "core.7": {
    "ko": "슬라이드 크기를 읽을 수 없습니다.",
    "en": "Could not read the slide dimensions."
  },
  "core.8": {
    "ko": "슬라이드가 없는 파일입니다.",
    "en": "This file contains no slides."
  },
  "core.9": {
    "ko": "한 번에 최대 120개 슬라이드를 지원합니다.",
    "en": "A maximum of 120 slides is supported at a time."
  },
  "core.10": {
    "ko": "슬라이드 연결 정보를 읽을 수 없습니다.",
    "en": "Could not read the slide relationship information."
  },
  "core.11": {
    "ko": "슬라이드 {p0}의 원본을 찾지 못했습니다.",
    "en": "Could not find the source for slide {p0}."
  },
  "core.12": {
    "ko": "유효한 위치를 입력하세요.",
    "en": "Enter a valid position."
  },
  "core.13": {
    "ko": "위치는 -1000cm부터 1000cm 사이로 입력하세요.",
    "en": "Enter a position between -1000 and 1000 cm."
  },
  "core.14": {
    "ko": "이동할 위치가 유효하지 않습니다.",
    "en": "The destination position is invalid."
  },
  "core.15": {
    "ko": "번호는 1, 3-5 형식으로 입력하세요.",
    "en": "Enter numbers in the format 1, 3-5."
  },
  "core.16": {
    "ko": "1부터 {p0}까지의 번호를 입력하세요.",
    "en": "Enter numbers from 1 to {p0}."
  },
  "createEditorRuntime.1": {
    "ko": "브라우저 저장 공간이 부족합니다. 최근 파일을 삭제한 뒤 다시 시도하세요.",
    "en": "Browser storage is full. Delete recent files and try again."
  },
  "createEditorRuntime.2": {
    "ko": "최근 파일 보관을 사용할 수 없습니다. 브라우저 저장소 설정을 확인하거나 다시 시도하세요.",
    "en": "Recent-file storage is unavailable. Check your browser storage settings or try again."
  },
  "createEditorRuntime.3": {
    "ko": "도형 / 텍스트",
    "en": "Shape / Text"
  },
  "createEditorRuntime.4": {
    "ko": "이미지",
    "en": "Image"
  },
  "createEditorRuntime.5": {
    "ko": "표 / 차트",
    "en": "Table / Chart"
  },
  "createEditorRuntime.6": {
    "ko": "연결선",
    "en": "Connector"
  },
  "createEditorRuntime.7": {
    "ko": "그룹",
    "en": "Group"
  },
  "createEditorRuntime.8": {
    "ko": "작업을 완료하지 못했습니다.",
    "en": "Could not complete the operation."
  },
  "createEditorRuntime.9": {
    "ko": "{p0}개 슬라이드에서 {p1}개 요소를 선택했습니다.",
    "en": "Selected {p1} elements on {p0} slides."
  },
  "createEditorRuntime.10": {
    "ko": "{p0}개 슬라이드에서 {p1}개 요소를 영역으로 선택했습니다.",
    "en": "Box-selected {p1} elements on {p0} slides."
  },
  "createEditorRuntime.11": {
    "ko": "{p0}너비 {p1} × 높이 {p2} cm",
    "en": "{p0}Width {p1} × Height {p2} cm"
  },
  "createEditorRuntime.12": {
    "ko": "선택 영역 · ",
    "en": "Selection bounds · "
  },
  "createEditorRuntime.13": {
    "ko": "개 · ",
    "en": " items · "
  },
  "createEditorRuntime.14": {
    "ko": "선택된 요소 없음",
    "en": "No elements selected"
  },
  "createEditorRuntime.15": {
    "ko": "{p0}개 슬라이드의 선택 요소에 적용합니다. 가로는 X 위치, 세로는 Y 위치만 맞춥니다.",
    "en": "Applies to selected elements on {p0} slides. Horizontal changes X; vertical changes Y."
  },
  "createEditorRuntime.16": {
    "ko": "슬라이드에 맞출 요소를 1개 이상 선택하세요.",
    "en": "Select at least one element to align to the slide."
  },
  "createEditorRuntime.17": {
    "ko": "{p0}개 요소 일치 · {p1}개 요소를 {p2}했습니다.",
    "en": "{p0} matching elements · {p1} elements {p2}."
  },
  "createEditorRuntime.18": {
    "ko": "선택에 추가",
    "en": "added to selection"
  },
  "createEditorRuntime.19": {
    "ko": "선택에서 해제",
    "en": "removed from selection"
  },
  "createEditorRuntime.20": {
    "ko": "{p0}개 일치 · {p1}개 슬라이드의 적용 대상을 {p2}했습니다.",
    "en": "{p0} matches · {p1} target slides {p2}."
  },
  "createEditorRuntime.21": {
    "ko": "추가",
    "en": "added"
  },
  "createEditorRuntime.22": {
    "ko": "해제",
    "en": "removed"
  },
  "createEditorRuntime.23": {
    "ko": "{p0}개 슬라이드 · {p1}개 적용 대상{p2}{p3}",
    "en": "{p0} slides · {p1} target slides{p2}{p3}"
  },
  "createEditorRuntime.24": {
    "ko": " · {p0}개 수정됨",
    "en": " · {p0} modified"
  },
  "createEditorRuntime.25": {
    "ko": " · 안내선 수정됨",
    "en": " · Guides modified"
  },
  "createEditorRuntime.26": {
    "ko": "슬라이드 {p0}을 적용 대상에 추가했습니다.",
    "en": "Added slide {p0} to the target slides."
  },
  "createEditorRuntime.27": {
    "ko": "슬라이드 {p0} 적용 대상",
    "en": "Target slide {p0}"
  },
  "createEditorRuntime.28": {
    "ko": "슬라이드 {p0} 미리보기. 클릭 또는 빈 곳에서 드래그하여 요소 선택",
    "en": "Slide {p0} preview. Click or drag on empty space to select elements"
  },
  "createEditorRuntime.29": {
    "ko": "미리보기 준비 중…",
    "en": "Preparing preview…"
  },
  "createEditorRuntime.30": {
    "ko": "왼쪽에서 미리볼 슬라이드를 선택하세요.",
    "en": "Select slides to preview in the left sidebar."
  },
  "createEditorRuntime.31": {
    "ko": "슬라이드 {p0} 내용",
    "en": "Slide {p0} content"
  },
  "createEditorRuntime.32": {
    "ko": "간이 미리보기 · 일부 서식 또는 요소가 생략될 수 있습니다.",
    "en": "Simplified preview · Some formatting or elements may be omitted."
  },
  "createEditorRuntime.33": {
    "ko": "클릭하여 이 슬라이드를 적용 대상에 추가합니다.",
    "en": "Click to add this slide to the target slides."
  },
  "createEditorRuntime.34": {
    "ko": "슬라이드 {p0} 비활성 미리보기. 클릭 또는 Enter, Space로 적용 대상에 추가",
    "en": "Inactive slide {p0} preview. Click, Enter or Space to add it to the target slides"
  },
  "createEditorRuntime.35": {
    "ko": "수정됨",
    "en": "Modified"
  },
  "createEditorRuntime.36": {
    "ko": "적용 대상",
    "en": "Target"
  },
  "createEditorRuntime.37": {
    "ko": " · 가로 고정",
    "en": " · Horizontal lock"
  },
  "createEditorRuntime.38": {
    "ko": " · 세로 고정",
    "en": " · Vertical lock"
  },
  "createEditorRuntime.39": {
    "ko": "{p0}개 슬라이드의 선택 요소를 정렬했습니다. ({p1})",
    "en": "Aligned selected elements on {p0} slides. ({p1})"
  },
  "createEditorRuntime.40": {
    "ko": "이미 해당 위치에 정렬되어 있습니다.",
    "en": "Already aligned at that position."
  },
  "createEditorRuntime.41": {
    "ko": "{p0}개 텍스트 상자",
    "en": "{p0} text boxes"
  },
  "createEditorRuntime.42": {
    "ko": "텍스트 줄바꿈과 높이를 계산하고 있습니다…",
    "en": "Calculating text wrapping and height…"
  },
  "createEditorRuntime.43": {
    "ko": "{p0}개 텍스트 상자의 높이를 내용에 맞췄습니다.{p1}",
    "en": "Fitted {p0} text boxes to their contents.{p1}"
  },
  "createEditorRuntime.44": {
    "ko": " {p0}개는 측정할 수 없어 건너뛰었습니다.",
    "en": " Skipped {p0} boxes that could not be measured."
  },
  "createEditorRuntime.45": {
    "ko": "일부 텍스트 상자는 현재 미리보기에서 높이를 측정할 수 없어 변경하지 않았습니다.",
    "en": "Some text boxes could not be measured in the current preview and were left unchanged."
  },
  "createEditorRuntime.46": {
    "ko": "슬라이드 미리보기를 만들고 있습니다…",
    "en": "Creating slide previews…"
  },
  "createEditorRuntime.47": {
    "ko": "미리보기에서 슬라이드를 찾지 못했습니다.",
    "en": "Could not find the slide in the preview."
  },
  "createEditorRuntime.48": {
    "ko": "미리보기를 만들지 못했습니다.",
    "en": "Could not create the preview."
  },
  "createEditorRuntime.49": {
    "ko": "미리보기 생성 중 · {p0} / {p1}",
    "en": "Creating previews · {p0} / {p1}"
  },
  "createEditorRuntime.50": {
    "ko": "{p0}개 슬라이드는 간이 미리보기로 표시합니다. PowerPoint의 일부 도형·효과는 브라우저에서 재현되지 않을 수 있습니다.",
    "en": "{p0} slides use simplified previews. Some PowerPoint shapes and effects may not be reproduced in the browser."
  },
  "createEditorRuntime.51": {
    "ko": "위치를 읽을 수 없는 요소 {p0}개는 선택 대상에서 제외했습니다.",
    "en": "Excluded {p0} elements with unreadable positions from selection."
  },
  "createEditorRuntime.52": {
    "ko": "슬라이드 미리보기를 만드는 중입니다…",
    "en": "Creating slide previews…"
  },
  "createEditorRuntime.53": {
    "ko": "{p0}개 슬라이드를 열었습니다. 요소를 클릭해 선택하세요.",
    "en": "Opened {p0} slides. Click an element to select it."
  },
  "createEditorRuntime.54": {
    "ko": ".pptx 파일을 선택하세요.",
    "en": "Choose a .pptx file."
  },
  "createEditorRuntime.55": {
    "ko": "50MB 이하의 PPTX 파일을 선택하세요.",
    "en": "Choose a PPTX file of 50 MB or less."
  },
  "createEditorRuntime.56": {
    "ko": "파일은 열었지만 최근 파일로 보관하지 못했습니다. ",
    "en": "The file opened, but could not be stored in recent files. "
  },
  "createEditorRuntime.57": {
    "ko": "보관된 파일이 없습니다. 다른 탭이나 브라우저에서 삭제되었을 수 있습니다.",
    "en": "The stored file is missing. It may have been deleted in another tab or by the browser."
  },
  "createEditorRuntime.58": {
    "ko": "보관된 PPTX를 열지 못했습니다. 원본 파일을 다시 선택하세요.",
    "en": "Could not open the stored PPTX. Choose the original file again."
  },
  "createEditorRuntime.59": {
    "ko": "{p0}개 슬라이드의 {p1}개 요소를 간격을 유지하며 옮겼습니다.",
    "en": "Moved {p1} elements on {p0} slides while keeping their spacing."
  },
  "createEditorRuntime.60": {
    "ko": "{p0}개 슬라이드에서 {p1}개 요소를 삭제했습니다. 마지막 변경 취소로 복원할 수 있습니다.",
    "en": "Deleted {p1} elements on {p0} slides. Undo last change to restore them."
  },
  "createEditorRuntime.61": {
    "ko": "마지막 변경을 취소했습니다.",
    "en": "Undid the last change."
  },
  "createEditorRuntime.62": {
    "ko": "수정한 PPTX를 다운로드했습니다.",
    "en": "Downloaded the edited PPTX."
  },
  "createEditorRuntime.63": {
    "ko": "다음 클릭·영역 선택부터 체크한 일치 조건을 만족하는 요소만 선택합니다.",
    "en": "Subsequent clicks and box selections will only select elements matching the checked criteria."
  },
  "createEditorRuntime.64": {
    "ko": "같은 좌표·영역의 요소를 선택합니다.",
    "en": "Select elements at the same position or within the same area."
  },
  "createEditorRuntime.65": {
    "ko": "오른쪽·아래는 +, 왼쪽·위는 −",
    "en": "Right/down: +, left/up: −"
  },
  "createEditorRuntime.66": {
    "ko": "가로 이동 (cm)",
    "en": "Horizontal offset (cm)"
  },
  "createEditorRuntime.67": {
    "ko": "세로 이동 (cm)",
    "en": "Vertical offset (cm)"
  },
  "createEditorRuntime.68": {
    "ko": "X와 Y를 모두 입력하세요.",
    "en": "Enter both X and Y."
  },
  "createEditorRuntime.69": {
    "ko": "예제 파일을 열지 못했습니다.",
    "en": "Could not open the example file."
  },
  "createEditorRuntime.70": {
    "ko": "예제-슬라이드.pptx",
    "en": "example-slides.pptx"
  },
  "createEditorRuntime.71": {
    "ko": "열린 PPTX의 적용 대상과 선택 요소 좌표를 읽습니다.",
    "en": "Read target slides and selected element coordinates in the open PPTX."
  },
  "createEditorRuntime.72": {
    "ko": "적용 대상 슬라이드의 지정 좌표에서 가장 앞에 있는 요소를 선택합니다. 좌표 단위는 cm입니다.",
    "en": "Select the frontmost element at the specified position on target slides. Coordinates are in cm."
  },
  "createEditorRuntime.73": {
    "ko": "먼저 PPTX를 열고 처리가 끝날 때까지 기다리세요.",
    "en": "Open a PPTX and wait for processing to finish first."
  },
  "createEditorRuntime.74": {
    "ko": "좌표가 유효하지 않습니다.",
    "en": "The coordinates are invalid."
  },
  "createEditorRuntime.75": {
    "ko": "선택 방식이 유효하지 않습니다.",
    "en": "The selection mode is invalid."
  },
  "createEditorRuntime.76": {
    "ko": "선택된 요소를 지정한 절대 위치로 옮기거나 같은 거리만큼 이동합니다. 원본 PPTX 다운로드는 별도입니다.",
    "en": "Move selected elements to an absolute position or by a shared offset. Downloading the edited PPTX is a separate action."
  },
  "createEditorRuntime.77": {
    "ko": "먼저 요소를 선택하세요.",
    "en": "Select an element first."
  },
  "createEditorRuntime.78": {
    "ko": "이동 방식과 좌표가 유효하지 않습니다.",
    "en": "The move mode or coordinates are invalid."
  },
  "guide-ui.1": {
    "ko": "공통",
    "en": "Shared"
  },
  "guide-ui.2": {
    "ko": "마스터",
    "en": "Master"
  },
  "guide-ui.3": {
    "ko": "레이아웃",
    "en": "Layout"
  },
  "guide-ui.4": {
    "ko": "세로",
    "en": "Vertical"
  },
  "guide-ui.5": {
    "ko": "가로",
    "en": "Horizontal"
  },
  "guide-ui.6": {
    "ko": "슬라이드 {p0} · 공통 {p1}개 / 마스터·레이아웃 {p2}개",
    "en": "Slide {p0} · {p1} shared / {p2} master and layout guides"
  },
  "guide-ui.7": {
    "ko": "위에서 (cm)",
    "en": "From top (cm)"
  },
  "guide-ui.8": {
    "ko": "{p0} 안내선을 모든 슬라이드에 추가했습니다.",
    "en": "Added a {p0} guide to all slides."
  },
  "guide-ui.9": {
    "ko": "{p0}에서 {p1} cm",
    "en": "{p1} cm from {p0}"
  },
  "guide-ui.10": {
    "ko": "세로 · 왼쪽",
    "en": "the left (vertical)"
  },
  "guide-ui.11": {
    "ko": "가로 · 위",
    "en": "the top (horizontal)"
  },
  "guide-ui.12": {
    "ko": "안내선 위치를 변경했습니다.",
    "en": "Changed the guide position."
  },
  "guide-ui.13": {
    "ko": "안내선 위치를 입력하세요.",
    "en": "Enter a guide position."
  },
  "guide-ui.14": {
    "ko": "선택한 공통 안내선을 삭제했습니다.",
    "en": "Deleted the selected shared guide."
  },
  "guides.1": {
    "ko": "안내선 위치는 -1000cm부터 1000cm 사이로 입력하세요.",
    "en": "Enter a guide position between -1000 and 1000 cm."
  },
  "guides.2": {
    "ko": "마스터·레이아웃 안내선은 여기서 이동할 수 없습니다.",
    "en": "Master and layout guides cannot be moved here."
  },
  "guides.3": {
    "ko": "마스터·레이아웃 안내선은 여기서 삭제할 수 없습니다.",
    "en": "Master and layout guides cannot be deleted here."
  },
  "layout-options.1": {
    "ko": "가로 정렬",
    "en": "Horizontal alignment"
  },
  "layout-options.2": {
    "ko": "왼쪽",
    "en": "Left"
  },
  "layout-options.3": {
    "ko": "가운데",
    "en": "Center"
  },
  "layout-options.4": {
    "ko": "오른쪽",
    "en": "Right"
  },
  "layout-options.5": {
    "ko": "세로 정렬",
    "en": "Vertical alignment"
  },
  "layout-options.6": {
    "ko": "상단",
    "en": "Top"
  },
  "layout-options.7": {
    "ko": "중단",
    "en": "Middle"
  },
  "layout-options.8": {
    "ko": "하단",
    "en": "Bottom"
  },
  "layout-options.9": {
    "ko": "가로 간격 균등",
    "en": "Distribute horizontally"
  },
  "layout-options.10": {
    "ko": "세로 간격 균등",
    "en": "Distribute vertically"
  },
  "layout-options.11": {
    "ko": "정렬",
    "en": "Align"
  },
  "layout.1": {
    "ko": "정렬 방식을 선택하세요.",
    "en": "Choose an alignment method."
  },
  "text-fit.1": {
    "ko": "텍스트 상자 높이를 계산할 수 없습니다.",
    "en": "Could not calculate the text-box height."
  },
  "PreviewResources.1": {
    "ko": "{p0} 초기화에 실패했습니다.",
    "en": "Could not initialize {p0}."
  },
  "PreviewResources.2": {
    "ko": "{p0} 파일을 불러오지 못했습니다. 다시 시도하세요.",
    "en": "Could not load {p0}. Try again."
  },
  "RecentFilesRepository.1": {
    "ko": "이 브라우저에서는 최근 파일 보관을 사용할 수 없습니다.",
    "en": "Recent-file storage is not supported in this browser."
  },
  "RecentFilesRepository.2": {
    "ko": "최근 파일 저장소에 연결하지 못했습니다. 다른 탭을 닫고 다시 시도하세요.",
    "en": "Could not connect to recent-file storage. Close other tabs and try again."
  },
  "RecentFilesRepository.3": {
    "ko": "다른 탭이 최근 파일 저장소를 사용 중입니다. 탭을 닫고 다시 시도하세요.",
    "en": "Another tab is using recent-file storage. Close it and try again."
  },
  "RecentFilesRepository.4": {
    "ko": "최근 파일 저장 작업이 취소되었습니다.",
    "en": "The recent-file storage operation was canceled."
  },
  "RecentFilesRepository.5": {
    "ko": "보관할 PPTX 파일이 유효하지 않습니다.",
    "en": "The PPTX file to store is invalid."
  },
  "App.1": {
    "ko": "편집기를 시작하지 못했습니다: {p0}",
    "en": "Could not start the editor: {p0}"
  },
  "Workspace.12": {
    "ko": "로컬 파일은 브라우저에서 처리합니다. Drive 연동 시 Google에서 읽고 저장합니다.",
    "en": "Local files are processed in your browser. Drive integration reads and saves files with Google."
  },
  "Workspace.13": {
    "ko": "모든 편집은 브라우저 안에서만 이루어집니다.",
    "en": "All editing takes place entirely in your browser."
  }
};

Object.assign(messages, {
  'language.label': {ko:'사용 언어',en:'Language'},
  'language.korean': {ko:'한글',en:'한글'},
  'language.english': {ko:'Eng.',en:'Eng.'},
  'app.title': {ko:'Slide Sync · 슬라이드 일괄 이동',en:'Slide Sync · Edit slides together'},
  'app.description': {ko:'여러 PPTX 슬라이드의 요소를 선택하고 편집하는 브라우저 편집기',en:'Select and edit elements across PPTX slides in your browser'},
  'coordinate.x': {ko:'X (cm)',en:'X (cm)'},
  'coordinate.y': {ko:'Y (cm)',en:'Y (cm)'}
});

Object.assign(messages, {
  'view.selectedElementsOnly': {ko:'선택한 요소가 있는 슬라이드만 보기',en:'Show slides with selected elements only'},
  'view.selectedElementsHelp': {ko:'현재 선택된 요소가 있는 슬라이드만 미리보기에 표시합니다. 요소 선택·해제·삭제·실행 취소에 따라 자동으로 갱신됩니다. 다른 보기 필터도 켜져 있으면 두 조건을 모두 적용합니다. 슬라이드 적용 대상이나 요소 선택 자체는 바꾸지 않습니다.',en:'Shows only slides that currently contain selected elements. Updates when elements are selected, deselected, deleted or restored with Undo. If another view filter is enabled, both conditions apply. Target slides and element selections are unchanged.'},
  'view.noSelectedElements': {ko:'선택한 요소가 있는 슬라이드가 없습니다. 보기 필터를 끄고 요소를 선택하세요.',en:'No slides contain selected elements. Turn off this view filter to select elements.'}
});

Object.assign(messages, {
  'sidebar.excluded': {ko:'제외',en:'Excluded'},
  'selection.slideTitle': {ko:'슬라이드 {p0}',en:'Slide {p0}'},
  'selection.selectedCount': {ko:'{p0}개 선택',en:'{p0} selected'}
});

Object.assign(messages, {
  'previewGrid.label': {ko:'페이지 갯수 보기',en:'Slide grid'},
  'previewGrid.default': {ko:'기본',en:'Default'},
  'previewGrid.columns': {ko:'가로 칸 수 (1–8)',en:'Columns (1–8)'},
  'previewGrid.rows': {ko:'세로 칸 수 (1–8)',en:'Rows (1–8)'}
});

Object.assign(messages, {
  'layout.resize.left': {ko:'왼쪽 패널 너비 조절',en:'Resize the left panel'},
  'layout.resize.right': {ko:'오른쪽 패널 너비 조절',en:'Resize the right panel'},
  'layout.resize.help': {ko:'드래그하거나 좌우 방향키로 너비를 조절합니다. 두 번 클릭 또는 Home으로 기본 너비를 복원합니다.',en:'Drag or use Left/Right arrow keys to resize. Double-click or press Home to restore the default width.'},
  'layout.resize.saveFailed': {ko:'너비는 적용했지만 브라우저에 저장하지 못했습니다. 브라우저 저장소 설정을 확인하세요.',en:'The widths were applied but could not be saved. Check your browser storage settings.'}
});
