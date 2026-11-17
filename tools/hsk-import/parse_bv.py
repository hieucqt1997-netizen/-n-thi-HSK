# Tách danh sách HSK 5–6 (bản in từ burningvocabulary.com)
import subprocess, re, json, sys, unicodedata
def parse(path):
    txt = subprocess.run(['pdftotext', '-layout', path, '-'], capture_output=True, text=True).stdout
    out, raw_kangxi = [], 0
    last = None
    for line in txt.splitlines():
        m = re.match(r'^\s{0,4}(\d{1,4})\s+([^\sA-Za-z]+)\s+(.+?)\s{2,}(.+?)\s{2,}(\d)\s*$', line)
        if m:
            no, hz, py, en, lv = m.groups()
            k = sum(1 for ch in hz if 0x2F00 <= ord(ch) <= 0x2FDF or 0x2E80 <= ord(ch) <= 0x2EFF)
            raw_kangxi += k > 0
            hz = hz.replace('\u2f1c', '口')  # PDF dùng nhầm bộ 又 (U+2F1C) cho chữ 口
            last = {'no': int(no), 'word': unicodedata.normalize('NFKC', hz), 'py': py.strip(), 'en': unicodedata.normalize('NFKC', en.strip()), 'level': int(lv), 'kangxiFixed': k > 0}
            out.append(last)
        elif last and line.strip() and not re.search(r'burningvocabulary|Chinese\s+Pinyin|^\d\d/\d\d/\d{4}', line) and re.match(r'^\s{20,}', line):
            last.setdefault('cont', []).append(line.strip())
    return out, raw_kangxi
if __name__ == '__main__':
    es, k = parse(sys.argv[1])
    json.dump(es, open(sys.argv[2], 'w'), ensure_ascii=False, indent=0)
    nos = [e['no'] for e in es]
    miss = sorted(set(range(min(nos), max(nos) + 1)) - set(nos))
    print(sys.argv[1], len(es), 'mục', min(nos), '-', max(nos), 'thiếu', len(miss), miss[:15], '| chữ bộ thủ Kangxi đã sửa:', k, '| dòng nối:', sum(1 for e in es if 'cont' in e))
