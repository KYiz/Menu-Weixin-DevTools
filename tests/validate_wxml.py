from pathlib import Path
import re
from xml.etree import ElementTree

root = Path(__file__).resolve().parents[1]
files = list(root.glob('pages/**/*.wxml'))
allowed_tags = {'view', 'text', 'image', 'button', 'block', 'scroll-view', 'label', 'radio-group', 'radio', 'textarea'}
for file in files:
    source = file.read_text(encoding='utf-8')
    source = re.sub(r'\bwx:else(?=[\s>])', 'wx:else=""', source)
    try:
        tree = ElementTree.fromstring('<root xmlns:wx="urn:wx">' + source + '</root>')
        unknown = {node.tag for node in tree.iter() if node.tag not in allowed_tags | {'root'}}
        if unknown:
            raise ValueError(f'{file}: unknown WXML components: {sorted(unknown)}')
    except ElementTree.ParseError as exc:
        raise ValueError(f'{file}: {exc}') from exc
print(f'PASS: XML structure and component tags for {len(files)} WXML files')
