import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {PreviewFormatFixtureBuilder, previewFormatCases} from '../tests/preview-format-fixtures.mjs';

/** @param {string} outputDirectory Destination for generated PPTX files and expected-output manifest. */
export async function generatePreviewFormatFixtures(outputDirectory = 'artifacts/preview-format-fixtures') {
  const context = {setTimeout, clearTimeout, setImmediate, Buffer, ArrayBuffer, Uint8Array};
  runInNewContext(await readFile(new URL('../public/vendor/jszip.min.js', import.meta.url), 'utf8'), context);
  const builder = new PreviewFormatFixtureBuilder(context.JSZip, await readFile(new URL('../public/sample.pptx', import.meta.url)));
  await mkdir(outputDirectory, {recursive:true});
  const manifest = [];
  for (const entry of previewFormatCases) {
    const file = `${entry.id}.pptx`;
    await writeFile(resolve(outputDirectory, file), await builder.build([entry]));
    manifest.push({file, cases:[entry]});
  }
  const combined = '00-all-known-cases.pptx';
  await writeFile(resolve(outputDirectory, combined), await builder.build(previewFormatCases));
  manifest.push({file:combined, cases:previewFormatCases});
  await writeFile(resolve(outputDirectory, 'manifest.json'), JSON.stringify(manifest, null, 2)+'\n');
  await writeFile(resolve(outputDirectory, 'README.md'), '# 미리보기 회귀 테스트 PPTX\n\n`00-all-known-cases.pptx`는 모든 케이스를 순서대로 담은 10장 문서입니다. 나머지는 한 케이스씩 담은 독립 파일입니다.\n\n| 파일 | 기대 결과 |\n| --- | --- |\n'+previewFormatCases.map(entry=>`| [${entry.id}.pptx](${entry.id}.pptx) | ${entry.description} |`).join('\n')+'\n\n생성: `npm run fixtures:preview-format`\n\n자동 검증: `npm run test:preview-format-fixtures`\n\n실제 앱의 PPTX 열기로 열거나 PowerPoint와 비교할 수 있습니다. 자동 검증은 로컬 Chrome 기준이며 PowerPoint 픽셀 일치나 설치되지 않은 글꼴의 모양을 보장하지 않습니다.\n');
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await generatePreviewFormatFixtures();
  console.log(`Generated ${manifest.length} PPTX files: artifacts/preview-format-fixtures`);
}
