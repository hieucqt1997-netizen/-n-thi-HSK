# -*- coding: utf-8 -*-
"""Bước 2: nghĩa tiếng Việt (CVDICT), câu ví dụ (thay ～, sinh pinyin), ID ổn định, độ phổ biến.
Vào: out/words_stage1.json  Ra: out/words_stage2.json"""
import json, re, collections, unicodedata
import jieba, pypinyin
from pypinyin import Style
from util import py_key
jieba.setLogLevel(60)

words = json.load(open('out/words_stage1.json'))
report = json.load(open('out/bao_cao_stage1.json'))
report['sua_tay'] = sorted(set(report.get('sua_tay', [])))

# Bổ sung số 677 bị thiếu trong tệp HSK4 (số thứ tự nhảy 676 → 678, giữa 戴 và 当时 theo ABC)
if not any(w['hanzi'] == '当' for w in words):
    words.append({'hanzi': '当', 'pinyin': 'dāng', 'level': 4, 'alt': None, 'ref': {},
                  'senses': [{'pos': 'giới từ', 'en': 'just at (a time or place); when', 'ex': ['～我到的时候，他已经走了。']}],
                  'src': 'Bổ sung: tệp HSK4 nhảy số 677 (giữa 戴 và 当时); lấy từ danh sách tham chiếu. Câu ví dụ tự soạn.'})
    report['sua_tay'].append('Bổ sung 当 (dāng) vào HSK4 — tệp gốc thiếu số 677')

# ---------- CVDICT ----------
cv = collections.defaultdict(list)
for line in open('ext/CVDICT/CVDICT.u8', encoding='utf-8'):
    if line.startswith('#'): continue
    m = re.match(r'^(\S+) (\S+) \[([^\]]+)\] /(.*)/\s*$', line)
    if m: cv[m.group(2)].append({'trad': m.group(1), 'py': m.group(3), 'defs': m.group(4).split('/')})

BAD = re.compile(r'^(Lượng từ\s*:|biến thể|xem |cũng viết là|viết tắt của|họ |\(Đài Loan\)|người Đài Loan|cách phát âm|dạng cổ|\(cổ\)|\(văn chương\)|\(phương ngữ\)|phát âm)', re.I)
def clean_def(d):
    d = re.sub(r'\b\S+\|\S+\[[^\]]+\]', '', d)        # bỏ tham chiếu 個|个[ge4]
    d = re.sub(r'\S*\[[a-zA-Z:1-5 ]+\]', '', d)
    d = re.sub(r'\s+', ' ', d).strip(' ;,')
    return d
def vi_lookup(hz, py):
    es = cv.get(hz, [])
    if not es: return None, 'khong_co'
    mine = py_key(py)
    exact = [e for e in es if py_key(e['py']) == mine]
    base = [e for e in es if py_key(e['py'])[0] == mine[0]]
    pick = exact or base or []
    how = 'khop_am' if exact else 'khop_khong_thanh' if base else 'khac_am'
    if not pick: return None, how
    # ưu tiên mục chữ thường (không phải tên riêng) nếu pinyin của từ viết thường
    if not py[:1].isupper():
        low = [e for e in pick if not e['py'][:1].isupper()]
        pick = low or pick
    defs = []
    for e in pick:
        for d in e['defs']:
            d = clean_def(d)
            if d and not BAD.match(d) and d not in defs and len(d) < 80: defs.append(d)
    if not defs: return None, 'rong'
    out, n = [], 0
    for d in defs:
        if n + len(d) > 70 and out: break
        out.append(d); n += len(d)
        if len(out) >= 4: break
    return '; '.join(out), how

# ---------- Pinyin câu ví dụ ----------
# Tách câu theo danh sách từ HSK (khớp dài nhất) để dùng pinyin chuẩn của từ; phần còn lại dùng pypinyin.
DICT_PY = {}
for w in words:
    if '……' not in w['hanzi']: DICT_PY.setdefault(w['hanzi'], w['pinyin'])
MAXL = 6
def seg(text):
    out, i = [], 0
    while i < len(text):
        hit = None
        for L in range(min(MAXL, len(text) - i), 0, -1):
            t = text[i:i + L]
            if t in DICT_PY: hit = t; break
        if hit is None:
            # dùng jieba cho phần ngoài từ điển
            j = i
            while j < len(text) and not any(text[j:j + L] in DICT_PY for L in range(1, MAXL + 1)): j += 1
            chunk = text[i:j] or text[i]
            out += list(jieba.cut(chunk)); i += len(chunk)
        else:
            out.append(hit); i += len(hit)
    return out
def apos(sylls):
    out = ''
    for k, s in enumerate(sylls):
        if k and unicodedata.normalize('NFD', s)[:1].lower() in ('a', 'o', 'e'): out += "'"
        out += s
    return out
TONES = {'\u0304': 1, '\u0301': 2, '\u030c': 3, '\u0300': 4}
def sent_pinyin(zh, word=None, wpy=None):
    parts = []
    global zh_tok
    zh_tok = seg(zh)
    for tok in zh_tok:
        if not re.search(r'[\u4e00-\u9fff]', tok): parts.append(tok); continue
        if tok in DICT_PY: parts.append(DICT_PY[tok]); continue
        sy = pypinyin.pinyin(tok, style=Style.TONE, errors='ignore', v_to_u=True)
        parts.append(apos([x[0] for x in sy]))
    # 儿化: 点儿 -> diǎnr ; biến điệu 一/不 khi đứng riêng
    fixed = []
    for k, p in enumerate(parts):
        if p in ('ér',) and k and re.search(r'[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]$', fixed[-1] or '') and zh_tok[k] == '儿':
            fixed[-1] += 'r'; continue
        fixed.append(p)
    parts = fixed
    def first_tone(p):
        d = unicodedata.normalize('NFD', p)
        for ch in d:
            if ch in TONES: return TONES[ch]
            if ch in ' ,.': break
        return 0
    for k in range(len(parts) - 1):
        nt = first_tone(parts[k + 1])
        if parts[k] == 'bù' and nt == 4: parts[k] = 'bú'
        if parts[k] == 'yī' and nt: parts[k] = 'yí' if nt == 4 else 'yì'
    out = ''
    for p in parts:
        if re.match(r'^[，。！？；：、“”‘’（）…—\s]', p):
            p = p.translate(str.maketrans('，。！？；：、“”（）', ',.!?;:,""()'))
            out = out.rstrip() + p + ' '
        elif re.match(r'^[0-9A-Za-z%]+$', p):
            out += p + ' '
        else:
            out += p + ' '
    out = re.sub(r'\s+', ' ', out).strip()
    return out[:1].upper() + out[1:]

def fill_example(ex, word):
    ex = ex.replace('~', '～')
    if '……' in word:
        parts = [p for p in word.split('……') if p]
        for p in parts: ex = ex.replace('～', p, 1)
        return ex
    return ex.replace('～', word)

def num_py(py):
    b, t = py_key(py)
    return b + t

ids = collections.Counter()
for w in words:
    w['pinyin'] = re.sub(r'^[…\s]+', '', w['pinyin']).replace(' …', '…')
    w['hanzi'] = unicodedata.normalize('NFKC', w['hanzi']).replace('......', '……').replace('...', '……')
    vi, how = vi_lookup(w['hanzi'].replace('……', ''), w['pinyin'])
    if not vi and w.get('alt'): vi, how = vi_lookup(w['alt'], w['pinyin'])
    w['vi'] = vi or ''
    w['viSrc'] = 'cvdict' if vi else ''
    report.setdefault('nghia_viet_' + how, []).append(w['hanzi']) if how != 'khop_am' else None
    for s in w['senses']:
        s['ex'] = [{'zh': fill_example(x, w['hanzi']), 'py': '', 'vi': ''} for x in s['ex']]
        for x in s['ex']:
            x['py'] = sent_pinyin(x['zh'])
    base = f"{w['hanzi'].replace('……', '-')}-{num_py(w['pinyin'])}"
    ids[base] += 1
    w['id'] = 'w-' + base + (f'-{ids[base]}' if ids[base] > 1 else '')
    w['freq'] = (w.get('ref') or {}).get('freq', 999999)
    w['hsk3'] = (w.get('ref') or {}).get('newest')

json.dump(words, open('out/words_stage2.json', 'w'), ensure_ascii=False)
json.dump(report, open('out/bao_cao_stage2.json', 'w'), ensure_ascii=False, indent=1)
c = collections.Counter(w['level'] for w in words)
print('tổng', len(words), dict(sorted(c.items())), 'không nghĩa Việt:', sum(1 for w in words if not w['vi']),
      'ví dụ:', sum(len(s['ex']) for w in words for s in w['senses']))
for k in [k for k in report if k.startswith('nghia_viet')]: print(k, len(report[k]), report[k][:30])
