"""Build the English practice deck using only Python's standard library.

Run from any directory with ``python3 scripts/build-english-sample.py``.
Preserve the Korean deck's package parts, geometry, styles and exercise objects.
"""

import json
import re
from pathlib import Path
from xml.sax.saxutils import escape, unescape
from zipfile import ZipFile


def build_english_sample():
    """Translate XML text and names; fail if any Korean string lacks a translation."""
    root = Path(__file__).resolve().parent.parent
    translations = json.loads((root / 'scripts/fixtures/sample-en.json').read_text())

    def translate(match):
        before, value, after = match.groups()
        decoded = unescape(value, {'&quot;': '"', '&apos;': "'"})
        if re.search('[가-힣]', decoded):
            if decoded not in translations:
                raise ValueError(f'Missing English translation: {decoded!r}')
            value = escape(translations[decoded], {'"': '&quot;'})
        return before + value + after

    parts = []
    with ZipFile(root / 'public/sample.pptx') as source:
        for entry in source.infolist():
            data = source.read(entry.filename)
            if entry.filename.endswith('.xml'):
                xml = data.decode('utf-8')
                xml = re.sub(r'(>)([^<>]*)()(?=<)', translate, xml)
                xml = re.sub(r'((?:name|typeface)=")([^"]*)(")', translate, xml)
                xml = xml.replace('lang="ko-KR"', 'lang="en-US"')
                if re.search('[가-힣]', xml):
                    raise ValueError(f'Untranslated Korean in {entry.filename}')
                data = xml.encode('utf-8')
            parts.append((entry, data))
    with ZipFile(root / 'public/sample-en.pptx', 'w') as target:
        for entry, data in parts:
            target.writestr(entry, data)


if __name__ == '__main__':
    build_english_sample()
