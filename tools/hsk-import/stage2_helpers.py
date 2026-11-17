# -*- coding: utf-8 -*-
"""Hàm dùng chung cho bước 3: tách từ câu ví dụ, chọn nghĩa tiếng Việt từ CVDICT khớp nghĩa tiếng Anh."""
import json, re, collections
import jieba
from util import py_key
jieba.setLogLevel(60)

_words = json.load(open('out/words_stage2.json'))
DICT = {w['hanzi'] for w in _words if '……' not in w['hanzi']}
MAXL = 6
def seg(text):
    out, i = [], 0
    while i < len(text):
        hit = None
        for L in range(min(MAXL, len(text) - i), 0, -1):
            if text[i:i + L] in DICT: hit = text[i:i + L]; break
        if hit is None:
            j = i
            while j < len(text) and not any(text[j:j + L] in DICT for L in range(1, MAXL + 1)): j += 1
            chunk = text[i:j] or text[i]
            out += list(jieba.cut(chunk)); i += len(chunk)
        else:
            out.append(hit); i += len(hit)
    return out

def order_tokens(zh):
    """Tách câu để làm bài sắp xếp. Trả về (mảnh, đáp án) hoặc None."""
    body = re.sub(r'[。！？!?…]+$', '', zh)
    toks = [t for t in seg(body) if not re.fullmatch(r'[\s，、,：:“”"]+', t)]
    ans = re.sub(r'[\s，、,：:“”"]', '', body)
    if not (3 <= len(toks) <= 7) or len(set(toks)) != len(toks) or ''.join(toks) != ans: return None
    return toks, ans

# ---------- CVDICT + CC-CEDICT (tiếng Anh) để căn nghĩa ----------
cv = collections.defaultdict(list)
for line in open('ext/CVDICT/CVDICT.u8', encoding='utf-8'):
    m = re.match(r'^(\S+) (\S+) \[([^\]]+)\] /(.*)/\s*$', line)
    if m: cv[m.group(2)].append({'trad': m.group(1), 'py': m.group(3), 'defs': m.group(4).split('/')})
ref = collections.defaultdict(list)
for e in json.load(open('ext/complete-hsk-vocabulary/complete.json')):
    for f in e['forms']: ref[e['simplified']].append({'trad': f['traditional'], 'num': f['transcriptions']['numeric'], 'en': f['meanings']})

BAD = re.compile(r'^(Lượng từ\s*:|LT\s*:|biến thể|xem |cũng viết là|cũng đọc là|họ [A-ZĐ]|\(Đài Loan\)|người Đài Loan|cách phát âm|dạng cổ|phát âm|\(cổ\)|\(phương ngữ\))', re.I)
def clean(d):
    d = re.sub(r'\([^()]*[一-鿿][^()]*\)', '', d)          # (蔬菜[shu1 cai4])
    d = re.sub(r'[一-鿿|]+\[[^\]]*\]', '', d)
    d = re.sub(r'[一-鿿]+', '', d)
    d = re.sub(r'\[[a-zA-Z0-9: ]+\]', '', d)
    d = re.sub(r'\((viết tắt của|xem|so sánh với|LT:|lượng từ:)?\s*\)', '', d)
    d = re.sub(r'\bLT\s*:\s*;?', '', d)
    d = re.sub(r'\s+([;,)])', r'\1', d)
    d = re.sub(r'\(\s+', '(', d)
    d = re.sub(r'\s+', ' ', d).strip(' ;,:')
    if d.count('(') != d.count(')'): d = d.replace('(', '').replace(')', '')
    return d

STOP = set('to a an the of sth sb one s etc used for in on at be or and with by as is it its someone something (of) do make'.split())
def toks(s): return {t for t in re.findall(r"[a-z]+", s.lower()) if t not in STOP and len(t) > 2}

def best_vi(w):
    hz = w['hanzi'].replace('……', '')
    mine = py_key(w['pinyin'])
    es = cv.get(hz, [])
    pick = [e for e in es if py_key(e['py']) == mine] or [e for e in es if py_key(e['py'])[0] == mine[0]]
    if not pick and w.get('alt'): pick = cv.get(w['alt'], [])
    if not pick: return ''
    if not w['pinyin'][:1].isupper():
        low = [e for e in pick if not e['py'][:1].isupper()]
        pick = low or pick
    src = toks(' '.join(s['en'] for s in w['senses']))
    cands = []  # (score, order, vi)
    order = 0
    for e in pick:
        defs = e['defs']
        en = next((r['en'] for r in ref.get(hz, []) if r['trad'] == e['trad'] and py_key(r['num']) == py_key(e['py'])), None)
        # CC-CEDICT trong kho tham chiếu gộp nghĩa bằng ';' — tách lại để căn theo '/'
        aligned = en if en and len(en) == len(defs) else None
        for i, d in enumerate(defs):
            c = clean(d)
            order += 1
            if not c or BAD.match(c) or BAD.match(d) or len(c) > 90: continue
            score = len(src & toks(aligned[i])) if aligned else 0
            cands.append((score, order, c))
    if not cands: return ''
    best = max(c[0] for c in cands)
    chosen = [c for c in cands if c[0] == best and best > 0] or cands[:2]
    if best > 0 and len(chosen) < 2:
        chosen += [c for c in cands if c not in chosen and c[0] > 0][:1]
    chosen = sorted(chosen, key=lambda c: c[1])
    out, n = [], 0
    for _, _, c in chosen:
        if c in out: continue
        if n + len(c) > 70 and out: break
        out.append(c); n += len(c)
        if len(out) >= 3: break
    return '; '.join(out)
