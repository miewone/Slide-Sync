import assert from 'node:assert/strict';
import {cpus,totalmem,platform,release,availableParallelism} from 'node:os';
import {execFileSync} from 'node:child_process';
import {makeDeckFixture} from '../tests/deck-fixtures.mjs';

/** Browser-side timing helpers. Mutation observers measure UI completion without polling delay. */
function installTiming() {
  globalThis.waitForUI=(predicate,action=()=>{})=>new Promise((resolve,reject)=>{
    const started=performance.now();
    const observer=new MutationObserver(check);
    const timer=setTimeout(()=>{observer.disconnect();reject(Error('Workflow UI timeout'));},60000);
    function check(){
      try{if(!predicate())return;clearTimeout(timer);observer.disconnect();resolve(performance.now()-started);}
      catch(error){clearTimeout(timer);observer.disconnect();reject(error);}
    }
    observer.observe(document.querySelector('#app'),{attributes:true,childList:true,subtree:true,characterData:true});
    try{action();queueMicrotask(check);}catch(error){clearTimeout(timer);observer.disconnect();reject(error);}
  });
  globalThis.openMeasured=(blob,name)=>new Promise((resolve,reject)=>{
    let firstPreviewMs=null,renderReadyMs=null;
    const start=performance.now(),stage=document.querySelector('#stage');
    const observer=new MutationObserver(records=>{
      for(const record of records)for(const node of record.addedNodes){
        if(node.nodeName==='IFRAME')node.addEventListener('load',()=>{
          if(firstPreviewMs===null&&node.contentDocument?.querySelector('[data-pptx-mover]'))firstPreviewMs=performance.now()-start;
        },{once:true});
      }
      if(renderReadyMs===null&&document.querySelector('#status').textContent.includes('개 슬라이드를 열었습니다.'))renderReadyMs=performance.now()-start;
    });
    observer.observe(document.querySelector('#app'),{childList:true,subtree:true,characterData:true});
    waitForUI(()=>document.querySelector('#filename').textContent===name&&!document.querySelector('#download').disabled,()=>{
      const transfer=new DataTransfer();transfer.items.add(new File([blob],name));
      const input=document.querySelector('#file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
    }).then(async()=>{
      const openReadyMs=performance.now()-start;
      if(firstPreviewMs===null)await waitForUI(()=>!!stage.querySelector('iframe')?.contentDocument?.querySelector('[data-pptx-mover]'));
      observer.disconnect();
      if(firstPreviewMs===null||renderReadyMs===null)throw Error('Missing load timing');
      resolve({firstPreviewMs,renderReadyMs,openReadyMs});
    }).catch(error=>{observer.disconnect();reject(error);});
  });
}

const metricLabels={
  firstPreviewMs:'첫 미리보기 내용 로드',renderReadyMs:'전체 슬라이드 캐시 준비',openReadyMs:'편집 활성화 (최근 파일 보관 포함)',
  selectAllMs:'전체 요소 선택',moveMs:'전체 요소 가로 0.1cm 이동',undoMoveMs:'이동 실행 취소',
  alignMs:'슬라이드 기준 가로 가운데 정렬',undoAlignMs:'정렬 실행 취소',fitMs:'전체 텍스트 상자 높이 맞춤',undoFitMs:'높이 맞춤 실행 취소',
  deleteMs:'전체 선택 요소 삭제',undoDeleteMs:'삭제 실행 취소',exportMs:'수정 PPTX 생성 (다운로드 준비)',reopenMs:'출력 PPTX 다시 열기',
};

/** @param {number[]} values Repeated samples. Return unrounded statistics in milliseconds. */
function stats(values) {
  const ordered=[...values].sort((a,b)=>a-b),middle=Math.floor(ordered.length/2);
  return {median:ordered.length%2?ordered[middle]:(ordered[middle-1]+ordered[middle])/2,min:ordered[0],max:ordered.at(-1)};
}

/** @param {object} browser Existing DevTools client. @param {string} origin Built preview URL. */
export async function measureWorkflows(browser,origin) {
  const version=await browser.send('Browser.getVersion');
  const report={measuredAt:new Date().toISOString(),revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
    worktree:execFileSync('git',['status','--short'],{encoding:'utf8'}).trim().split('\n').filter(Boolean),
    environment:{browser:version.product,v8:version.jsVersion,node:process.version,os:`${platform()} ${release()}`,
      cpu:cpus()[0]?.model,logicalCpus:cpus().length,availableParallelism:availableParallelism(),hostMemoryGiB:totalmem()/1024**3,
      viewport:{width:1440,height:1000,deviceScaleFactor:1},headless:true,gpuDisabled:true,server:'Vite production preview on localhost',
      throttling:'No simulated CPU/network throttling; machine is not isolated from other workloads'},
    methodology:{repetitions:3,slideCounts:[10,100],order:'10 then 100, repeated three times',
      fixture:'Shipped sample first slide repeated; ZIP dates fixed at 2020-01-01; DEFLATE level 6; no charts added',
      cache:'Fresh page each trial in one browser/profile; HTTP cache retained; JSZip and fixture loaded before timer; renderer modules load during file open',
      timing:'performance.now() in page; MutationObserver completion (not screenshot/physical paint); original file reads, parsing and preview cache included',
      persistence:'Recent-file DB cleared before each trial; original is saved as part of editor readiness',
      output:'Edited PPTX Blob generation and UI readiness; OS disk-write/save-dialog time excluded',
      workflow:'Each measured edit is undone before the next; final all-object move +0.1cm is exported and all slide XML coordinates verified'},
    runs:[],summary:[]};
  for(let repeat=1;repeat<=3;repeat++)for(const slides of [10,100]) {
    browser.errors=[];await browser.navigate(origin);
    await browser.until('!!document.querySelector("#demo")&&!document.querySelector("#demo").disabled','workflow app ready');
    await browser.evaluate(`(${installTiming.toString()})()`);
    await browser.evaluate(`(async()=>{
      globalThis.makeDeckFixture=${makeDeckFixture.toString()};
      await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('vendor/jszip.min.js',document.baseURI);s.onload=resolve;s.onerror=reject;document.head.append(s);});
      const sample=await (await fetch(new URL('sample.pptx',document.baseURI))).arrayBuffer();
      globalThis.workflowSampleHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',sample)),n=>n.toString(16).padStart(2,'0')).join('');
      const zip=await JSZip.loadAsync(await makeDeckFixture(JSZip,sample,${slides}));
      for(const file of Object.values(zip.files))file.date=new Date('2020-01-01T00:00:00Z');
      globalThis.workflowBlob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
      globalThis.workflowOriginalXml=await zip.file('ppt/slides/slide1.xml').async('string');
      document.querySelector('#recent-files-open').click();
      await waitForUI(()=>!document.querySelector('#recent-files-dialog [role=status]').textContent.includes('처리'));
      if(!document.querySelector('#recent-files-clear').disabled)await waitForUI(()=>!document.querySelector('.recent-files-list li'),()=>document.querySelector('#recent-files-clear').click());
      document.querySelector('#recent-files-close').click();
    })()`);
    const fixture=await browser.evaluate(`(async()=>({bytes:workflowBlob.size,sourceSha256:workflowSampleHash,elementsPerSlide:[...new DOMParser().parseFromString(workflowOriginalXml,'application/xml').getElementsByTagNameNS('*','spTree')[0].children].filter(n=>['sp','pic','grpSp','cxnSp','graphicFrame'].includes(n.localName)).length,sha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await workflowBlob.arrayBuffer())),n=>n.toString(16).padStart(2,'0')).join('')}))()`);
    const timing=await browser.evaluate(`openMeasured(workflowBlob,'workflow-${slides}-${repeat}.pptx')`);
    assert.equal(await browser.evaluate('document.querySelectorAll(".slide-card").length'),slides);
    assert.equal(await browser.evaluate('document.querySelector("#notice").textContent'),'', 'fixture fully loads and stores without warnings');
    const run={slides,repeat,fixture,...timing};
    run.frames=await browser.evaluate('document.querySelectorAll("#stage iframe").length');
    const action=async(code,predicate)=>browser.evaluate(`waitForUI(()=>${predicate},()=>{${code}})`);
    const count='Number(document.querySelector(".selection-number").textContent)';
    run.selectAllMs=await action(`document.querySelector('.slide-surface').dispatchEvent(new KeyboardEvent('keydown',{key:'a',ctrlKey:true,bubbles:true}));`,`${count}>0`);
    run.selectedElements=await browser.evaluate(count);
    assert.equal(run.selectedElements,slides*fixture.elementsPerSlide,'all fixture elements are selected');
    const undo=()=>action("document.querySelector('#undo').click();","document.querySelector('#status').textContent==='마지막 변경을 취소했습니다.'&&!document.querySelector('#download').disabled");
    const move=()=>action("document.querySelector('#move-mode').value='relative';document.querySelector('#move-mode').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#x').value='0.1';document.querySelector('#y').value='0';document.querySelector('#move').click();","document.querySelector('#status').textContent.includes('간격을 유지하며 옮겼습니다')&&!document.querySelector('#download').disabled");
    run.moveMs=await move();run.undoMoveMs=await undo();
    run.alignMs=await action("document.querySelector('#layout-target').value='slide';document.querySelector('[data-layout=center]').click();","document.querySelector('#status').textContent.includes('선택 요소를 정렬했습니다')&&!document.querySelector('#download').disabled");
    run.undoAlignMs=await undo();
    run.textBoxes=await browser.evaluate('parseInt(document.querySelector("#fit-count").textContent,10)');
    run.fitMs=await action("document.querySelector('#fit-scope').value='all';document.querySelector('#fit-scope').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#fit-text').click();","document.querySelector('#status').textContent.includes('높이를 내용에 맞췄습니다')&&!document.querySelector('#download').disabled");
    run.fitStatus=await browser.evaluate('document.querySelector("#status").textContent');
    assert.ok(!run.fitStatus.includes('건너뛰'),'no skipped text boxes');
    run.undoFitMs=await undo();
    run.deleteMs=await action("document.querySelector('#delete-selection').click();",`${count}===0&&!document.querySelector('#download').disabled`);
    assert.equal(await browser.evaluate('document.querySelector("#stage iframe").contentDocument.querySelectorAll("[data-pptx-mover]:not([hidden])").length'),0);
    run.undoDeleteMs=await undo();assert.equal(await browser.evaluate(count),run.selectedElements);
    // Export a known change, inspect all slides, then reopen the Blob without involving a disk download.
    await move();
    await browser.evaluate(`globalThis.workflowOutput=null;
      const createURL=URL.createObjectURL;URL.createObjectURL=function(blob){globalThis.workflowOutput=blob;return createURL.call(this,blob);};
      const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(!this.download)click.call(this);};`);
    run.exportMs=await action("document.querySelector('#download').click();","!!workflowOutput&&document.querySelector('#status').textContent==='수정한 PPTX를 다운로드했습니다.'&&!document.querySelector('#download').disabled");
    run.output=await browser.evaluate(`(async()=>{
      const parse=xml=>new DOMParser().parseFromString(xml,'application/xml');
      const rows=doc=>[...doc.getElementsByTagNameNS('*','spTree')[0].children].filter(n=>['sp','pic','grpSp','cxnSp','graphicFrame'].includes(n.localName)).map(n=>({
        id:n.getElementsByTagNameNS('*','cNvPr')[0].getAttribute('id'),x:Number(n.getElementsByTagNameNS('*','off')[0].getAttribute('x'))}));
      const expected=rows(parse(workflowOriginalXml)),zip=await JSZip.loadAsync(workflowOutput);
      let verifiedSlides=0,verifiedElements=0;
      for(let i=1;i<=${slides};i++){
        const actual=rows(parse(await zip.file('ppt/slides/slide'+i+'.xml').async('string')));
        if(actual.length!==expected.length||!actual.every((row,index)=>row.id===expected[index].id&&row.x===expected[index].x+36000))throw Error('Exported coordinates differ on slide '+i);
        verifiedSlides++;verifiedElements+=actual.length;
      }
      return {bytes:workflowOutput.size,verifiedSlides,verifiedElements};
    })()`);
    assert.equal(run.output.verifiedElements,run.selectedElements);
    run.reopenMs=(await browser.evaluate(`openMeasured(workflowOutput,'workflow-output-${slides}-${repeat}.pptx')`)).openReadyMs;
    assert.equal(await browser.evaluate('document.querySelectorAll(".slide-card").length'),slides);
    assert.deepEqual(browser.errors,[],'workflow browser errors');
    report.runs.push(run);console.log('WORKFLOW '+JSON.stringify(run));
  }
  assert.equal(new Set(report.runs.map(run=>run.fixture.sourceSha256)).size,1,'source sample must stay unchanged during measurement');
  for(const slides of [10,100]) {
    const runs=report.runs.filter(run=>run.slides===slides);
    assert.equal(new Set(runs.map(run=>run.fixture.sha256)).size,1,'repeats must use byte-identical input');
    report.summary.push({slides,elements:runs[0].selectedElements,textBoxes:runs[0].textBoxes,
      metrics:Object.fromEntries(Object.keys(metricLabels).map(key=>[key,stats(runs.map(run=>run[key]))]))});
  }
  return report;
}

/** @param {object} report Completed measurements; format observed medians/ranges rather than estimates. */
export function workflowMarkdown(report) {
  const seconds=value=>(Math.round(value+1e-6)/1000).toFixed(3);
  const cells=key=>report.summary.map(row=>{const s=row.metrics[key];return `${seconds(s.median)} (${seconds(s.min)}–${seconds(s.max)})`;}).join(' | ');
  return `# 10장·100장 렌더링·편집·출력 실측\n\n측정 시각: ${report.measuredAt} (UTC)\n\n기준 커밋: \`${report.revision}\`. 측정 시 작업 트리 변경 목록은 [원본 JSON](workflow-performance-results.json)에 기록했습니다.\n\n## 작업별 소요 시간\n\n단위는 **초**, 값은 **3회 중앙값 (최소–최대)**입니다. 같은 브라우저 프로필에서 10장 → 100장 순서를 3회 반복하고 매번 페이지를 새로 열었습니다.\n\n| 작업 | 10장 | 100장 |\n| --- | ---: | ---: |\n${Object.entries(metricLabels).map(([key,label])=>`| ${label} | ${cells(key)} |`).join('\n')}\n\n## 입력과 검증 범위\n\n| 구분 | 10장 | 100장 |\n| --- | ---: | ---: |\n| 초기 생성 iframe 수 (첫 실행) | ${report.summary.map(row=>report.runs.find(run=>run.slides===row.slides).frames).join(' | ')} |\n| 선택·이동·정렬·삭제 요소 수 | ${report.summary.map(row=>row.elements).join(' | ')} |\n| 높이 맞춤 대상 텍스트 상자 수 | ${report.summary.map(row=>row.textBoxes).join(' | ')} |\n| 입력 PPTX 바이트 (첫 실행) | ${report.summary.map(row=>report.runs.find(run=>run.slides===row.slides).fixture.bytes).join(' | ')} |\n| 출력 PPTX 바이트 (첫 실행) | ${report.summary.map(row=>report.runs.find(run=>run.slides===row.slides).output.bytes).join(' | ')} |\n\n- 제공 예제의 첫 슬라이드를 반복한 합성 PPTX입니다. 슬라이드당 편집 요소 ${report.runs[0].fixture.elementsPerSlide}개이며 차트를 추가하지 않았습니다. 이미지·효과가 많은 실제 문서의 성능을 대표하지 않습니다.\n- 모든 슬라이드의 미리보기 캐시를 만들지만 처음에는 화면 근처의 iframe만 생성합니다. 전체 슬라이드를 한 번에 화면에 표시하거나 끝까지 스크롤한 시간은 아닙니다.\n- 각 편집은 전체 슬라이드에 적용한 뒤 실행 취소하고 다음 작업을 측정했습니다. 삭제 후 선택 복원, 텍스트 맞춤 건너뛰기 없음, 출력의 모든 슬라이드 요소 수·ID와 가로 0.1cm 이동 좌표를 검사했습니다.\n- 출력은 마지막 전체 이동을 반영한 PPTX이며 생성 후 다시 열어 슬라이드 수를 검사했습니다. 모든 반복에서 검증을 통과한 경우에만 결과 파일을 기록합니다.\n\n## 측정 환경\n\n- 브라우저: ${report.environment.browser}, headless, GPU 비활성화, 1440×1000, 배율 1.\n- 실행 환경: Node ${report.environment.node}, ${report.environment.os}.\n- CPU: ${report.environment.cpu}; OS가 보고한 논리 CPU ${report.environment.logicalCpus}개, 사용 가능 병렬도 ${report.environment.availableParallelism}.\n- OS가 보고한 메모리: ${report.environment.hostMemoryGiB.toFixed(1)} GiB. 브라우저 전용 할당량이나 실제 사용량이 아닙니다.\n- 서버: 로컬 Vite production preview. CPU·네트워크의 인위적 제한은 없으며 다른 프로세스와 격리한 전용 성능 환경은 아닙니다.\n\n## 시간의 정의와 한계\n\n- 픽스처 생성·압축과 JSZip 사전 로딩은 측정에서 제외했습니다. 슬라이드 렌더러는 페이지마다 파일을 열 때 로드하며 브라우저 HTTP 캐시는 유지합니다. 완전히 비어 있는 네트워크 캐시의 첫 방문 시간은 아닙니다.\n- 첫 미리보기는 파일 입력부터 첫 iframe의 편집 요소가 확인되는 load 이벤트까지입니다. 실제 화면 페인트 완료 시간은 아닙니다.\n- 전체 캐시 준비는 전체 슬라이드 열기 완료 상태 문구까지, 편집 활성화는 최근 파일 원본 보관을 포함해 다운로드 버튼이 활성화될 때까지입니다. 매 실행 전에 최근 파일 목록을 비웁니다.\n- 편집 시간은 페이지 안의 performance.now와 DOM 변경 관찰로 측정한 UI 갱신 완료 시간입니다. 자동화 통신이나 100ms 폴링 지연을 더하지 않았으며 실제 디스플레이 출력 지연은 포함하지 않습니다.\n- 출력 시간은 XML 반영·ZIP 압축·Blob 생성과 다운로드 준비까지입니다. 운영체제 저장 대화상자와 디스크 기록 시간은 포함하지 않습니다.\n- 3회 관측값이며 성능 보장이나 과거 버전 대비 개선율이 아닙니다. 원본 실행별 값은 JSON에 밀리초로 보존했습니다.\n\n## 재실행\n\n\`\`\`bash\nnpm run build\nnpm run test:browser -- --benchmark-workflows\n\`\`\`\n\nChrome과 로컬 포트 5179·4179·4189를 사용합니다. 생성 결과는 \`artifacts/workflow-performance.json\`, \`artifacts/workflow-performance.md\`입니다. 기존 30·60·120장 결과는 [기존 성능 문서](performance.md)에 보존했습니다.\n`;
}
