import {memo} from 'react';
import {Button} from './ui.jsx';
import {Help} from './Help.jsx';
import {ElementSearchPanel} from './ElementSearchPanel.jsx';
import {SelectionSummary} from './Selection.jsx';
import {MovePanel} from './MovePanel.jsx';
import {GuidePanel} from './GuidePanel.jsx';
import {LayoutPanel} from './LayoutPanel.jsx';
import {TextFitPanel} from './TextFitPanel.jsx';
import {SelectionPanel} from './SelectionPanel.jsx';

/** Stable form boundary: React state updates never overwrite native edit drafts. */
export const Inspector = memo(function Inspector() {
  return <aside className="inspector"><h2>선택한 요소 편집</h2><SelectionSummary/>
    <div className="delete-selection-control"><Button id="delete-selection" variant="danger" disabled>선택 요소 삭제</Button><Help helpKey="delete-selection"/></div>
    <Button id="undo" full disabled>↶ 마지막 변경 취소</Button>
    <ElementSearchPanel/><LayoutPanel/><MovePanel/><GuidePanel/><TextFitPanel/><SelectionPanel/>
  </aside>;
});
