# -*- coding: utf-8 -*-
"""Bước 1: Hợp nhất danh sách HSK 1–6 từ PDF của người dùng, sửa lỗi tách,
đối chiếu với danh sách tham chiếu (complete-hsk-vocabulary, MIT) và thêm nghĩa
tiếng Việt từ CVDICT (CC BY-SA 4.0). Xuất: out/words_raw.json + out/bao_cao.json
"""
import json, re, unicodedata, collections, os
from parse_hanban import parse as parse_hanban
from parse_bv import parse as parse_bv

U = '/mnt/user-data/uploads/'
OUT = 'out'; os.makedirs(OUT, exist_ok=True)
REF = 'ext/complete-hsk-vocabulary/'
report = collections.defaultdict(list)

TONE = {'̄': '1', '́': '2', '̌': '3', '̀': '4'}
def py_key(s, tones=True):
    """'nǐ hǎo' | 'ni3 hao3' -> ('nihao','33')"""
    s = unicodedata.normalize('NFD', str(s)).lower()
    base, tn = '', ''
    i = 0
    while i < len(s):
        c = s[i]
        if 'a' <= c <= 'z':
            if c == 'u' and i + 1 < len(s) and s[i + 1] in '̈:':
                base += 'v'; i += 2; continue
            base += c
        elif c in TONE: tn += TONE[c]
        elif c in '1234': tn += c
        i += 1
    return (base, tn) if tones else base

def nfkc(s): return unicodedata.normalize('NFKC', s)

# ---------- Tham chiếu ----------
ref = json.load(open(REF + 'complete.json'))
ref_by = collections.defaultdict(list)
for e in ref: ref_by[e['simplified']].append(e)
ref_old = {}
for L in range(1, 7):
    for e in json.load(open(f'{REF}wordlists/exclusive/old/{L}.json')): ref_old.setdefault(e['simplified'], L)
def ref_info(hz):
    es = ref_by.get(hz, [])
    lv = {}
    for e in es:
        for l in e['level']:
            k, v = l.split('-'); lv.setdefault(k, int(v))
    freq = min((e.get('frequency') or 999999) for e in es) if es else 999999
    pys = [f['transcriptions'] for e in es for f in e['forms']]
    return {'newest': lv.get('newest'), 'new': lv.get('new'), 'old': lv.get('old'), 'freq': freq, 'pys': pys,
            'en': [m for e in es for f in e['forms'] for m in f['meanings']]}

# ---------- HSK 1–4 (Hanban) ----------
POSVI = {'n': 'danh từ', 'v': 'động từ', 'adj': 'tính từ', 'adv': 'phó từ', 'pron': 'đại từ', 'num': 'số từ', 'nm': 'lượng từ',
         'm': 'lượng từ', 'mp': 'trợ từ ngữ khí', 'sa': 'trợ từ kết cấu', 'aux': 'động từ năng nguyện', 'prep': 'giới từ',
         'conj': 'liên từ', 'int': 'thán từ', 'ono': 'từ tượng thanh', 'pref': 'tiền tố', 'suf': 'hậu tố', 'vm': 'động từ năng nguyện',
         'q': 'lượng từ', 'pa': 'trợ từ động thái', 'part': 'trợ từ', 'aa': 'trợ từ động thái', 'ma': 'trợ từ ngữ khí'}
def pos_vi(p):
    k = p.strip().rstrip('.').lower()
    return POSVI.get(k, p.strip())

def fix_hanban(e):
    w, py = e['word'], e['py']
    w = w.replace('......', '……').replace('...', '……').replace('…', '…')
    han = ''.join(re.findall(r'[一-鿿（）()…]+', w))
    lat = ' '.join(re.findall(r'[A-Za-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüĀÁǍÀĒÉĚÈŌÓǑÒ’\'.…-]+', w))
    if lat and not re.match(r'^[一-鿿]', w):   # pinyin đứng trước chữ Hán
        py = (lat + ' ' + py).strip()
    elif lat:
        py = (lat + ' ' + py).strip()
    # "这(这儿)" -> 这, biến thể 这儿
    han = re.sub(r'[（(][）)]', '', han)
    alt = None
    m = re.match(r'^([一-鿿]+)[（(]([一-鿿]+)[）)]$', han)
    if m: han, alt = m.group(1), m.group(2)
    py = re.sub(r'[（(].*?[）)]', '', py).strip()
    py = py.replace('...', '…').replace('……', '…')
    han = re.sub(r'[（(][）)]', '', han)
    han = re.sub(r'…+', '……', han).lstrip('…')
    e['word'], e['py'], e['alt'] = han, py, alt
    # gộp dòng nghĩa trống vào nghĩa trước
    ss = []
    for s in e['senses']:
        exs = list(s.get('ex') or [])
        if not s['en'].strip() and ss:
            ss[-1]['ex'] += exs
            continue
        ss.append({'pos': s['pos'], 'en': re.sub(r'\s+', ' ', s['en']).strip(), 'ex': exs})
    e['senses'] = ss
    return e

def load_hanban(path):
    return [fix_hanban(e) for e in parse_hanban(path)]

hb = {L: load_hanban(U + f) for L, f in [(1, 'ba9cef22-HSK1.pdf'), (2, 'fb0aa661-HSK2.pdf'), (3, 'f8a6d3da-HSK3.pdf'), (4, 'c7e66108-HSK4.pdf')]}
# Sửa tay các dòng PDF bị dính nhau (số 325–327 trong danh sách cộng dồn)
def manual_fix(lst):
    out = []
    for e in lst:
        if e['word'] == '冰箱不但……':
            s = e['senses']
            out.append({**e, 'word': '冰箱', 'py': 'bīngxiāng', 'senses': [s[0]]})
            out.append({**e, 'no': e['no'] + 1, 'word': '不但……而且……', 'py': 'búdàn…érqiě…', 'senses': [s[1]] if len(s) > 1 else []})
            report['sua_tay'].append('Tách dòng PDF dính: 冰箱 / 不但……而且……')
        elif e['word'] == '才而且……':
            out.append({**e, 'word': '才', 'py': 'cái'})
            report['sua_tay'].append('Sửa dòng PDF dính: 才 (cái)')
        else:
            out.append(e)
    return out
hb = {L: manual_fix(v) for L, v in hb.items()}

level14 = {}
for L in range(1, 5):
    for e in hb[L]:
        level14.setdefault(e['word'], L)
words = []
seen = set()
for e in hb[4]:
    key = (e['word'], py_key(e['py']))
    if key in seen: continue
    if any(k[0] == e['word'] for k in seen): report['cung_chu_khac_am_1_4'].append(f"{e['word']} {e['py']}")
    seen.add(key)
    L = level14.get(e['word'], 4)
    words.append({'hanzi': e['word'], 'pinyin': e['py'], 'level': L, 'alt': e.get('alt'),
                  'senses': [{'pos': pos_vi(s['pos']) if s['pos'] else '', 'en': s['en'], 'ex': s['ex']} for s in e['senses']],
                  'src': 'Danh sách 新HSK词汇（汉语-英语） cấp 1–4 (tệp người dùng cung cấp)'})

# ---------- HSK 5–6 ----------
bv, _ = parse_bv(U + '46f5b4f5-HSK6.pdf')
bv5, _ = parse_bv(U + '633366b8-HSK5.pdf')
bvall = {e['word']: e for e in bv5 + bv}
for e in sorted(bvall.values(), key=lambda e: e['no']):
    if e['level'] < 5: continue
    words.append({'hanzi': e['word'], 'pinyin': e['py'], 'level': e['level'], 'alt': None,
                  'senses': [{'pos': '', 'en': re.sub(r'\s+', ' ', e['en']).strip(), 'ex': []}],
                  'src': 'Danh sách HSK 5–6 (bản in burningvocabulary.com, tệp người dùng cung cấp)', 'kangxiFixed': e.get('kangxiFixed')})

# ---------- Đối chiếu danh sách tham chiếu ----------
have = collections.Counter(w['level'] for w in words)
report['so_luong'] = dict(sorted(have.items()))
ours = {(w['hanzi'], w['level']) for w in words}
for hz, L in ref_old.items():
    if not any(w['hanzi'] == hz for w in words):
        report['thieu_so_voi_tham_chieu'].append(f'HSK{L}: {hz}')
ourhz = collections.Counter(w['hanzi'] for w in words)
for w in words:
    r = ref_old.get(w['hanzi'])
    if r is None: report['khong_co_trong_tham_chieu'].append(f"HSK{w['level']}: {w['hanzi']}")
    elif r != w['level']: report['lech_cap'].append(f"{w['hanzi']}: tệp={w['level']} tham chiếu={r}")
for hz, c in ourhz.items():
    if c > 1: report['trung_chu_khac_cap'].append(hz + ' (' + ', '.join(f"HSK{w['level']} {w['pinyin']}" for w in words if w['hanzi'] == hz) + ')')

# ---------- Pinyin: đối chiếu và chuẩn hóa hiển thị ----------
def join_syllables(py):
    """'ài hù' -> 'àihù'; thêm ' trước âm tiết bắt đầu bằng a/o/e."""
    sy = py.split()
    out = sy[0] if sy else ''
    for s in sy[1:]:
        out += ("'" if unicodedata.normalize('NFD', s)[0].lower() in 'aoe' else '') + s
    return out
for w in words:
    info = ref_info(w['hanzi'])
    w['ref'] = info
    mine = py_key(w['pinyin'])
    refs = [py_key(t['numeric']) for t in info['pys']]
    if w['level'] >= 5:
        w['pinyin'] = join_syllables(w['pinyin'])
    # Dấu thanh đặt sai nguyên âm (vd. páiqíu -> páiqiú): cùng âm, cùng thanh nhưng chuỗi khác
    flat = lambda x: re.sub(r"[\s'’-]", '', unicodedata.normalize('NFC', x).lower())
    for t in info['pys']:
        if w['level'] <= 4 and ':' not in t['pinyin'] and not w['pinyin'][:1].isupper() and py_key(t['numeric']) == mine and flat(t['pinyin']) != flat(w['pinyin']) and flat(t['pinyin']).replace('v', 'ü') != flat(w['pinyin']):
            fixed = join_syllables(t['pinyin'])
            if w['pinyin'][:1].isupper(): fixed = fixed[:1].upper() + fixed[1:]
            report['sua_vi_tri_dau_thanh'].append(f"HSK{w['level']} {w['hanzi']}: {w['pinyin']} → {fixed}")
            w['pinyin'] = fixed
            break
    if refs and mine not in refs:
        same_base = [r for r in refs if r[0] == mine[0]]
        kind = 'bien_dieu_hoac_thanh_nhe' if same_base else 'khac_am'
        refpy = next((t['pinyin'] for t in info['pys'] if py_key(t['numeric'])[0] == mine[0]), info['pys'][0]['pinyin'])
        w['pinyinRef'] = join_syllables(refpy)
        report['pinyin_' + kind].append(f"HSK{w['level']} {w['hanzi']}: tệp «{w['pinyin']}» / từ điển «{w['pinyinRef']}»")

# Bỏ từ cấp 5–6 trùng cả chữ lẫn âm với cấp 1–4 (do hai nguồn dùng hai phiên bản danh sách khác nhau)
low = {}
for w in words:
    if w['level'] <= 4: low.setdefault(w['hanzi'], []).append(py_key(w['pinyin'])[0])
kept = []
for w in words:
    if w['level'] >= 5 and py_key(w['pinyin'])[0] in low.get(w['hanzi'], []):
        report['bo_trung_cap_5_6'].append(f"{w['hanzi']} ({w['pinyin']}) — đã có ở HSK 1–4, bỏ khỏi HSK{w['level']}")
        continue
    kept.append(w)
words = kept
report['so_luong_sau_bo_trung'] = dict(sorted(collections.Counter(w['level'] for w in words).items()))
json.dump(words, open(f'{OUT}/words_stage1.json', 'w'), ensure_ascii=False)
json.dump(report, open(f'{OUT}/bao_cao_stage1.json', 'w'), ensure_ascii=False, indent=1)
print({k: (len(v) if isinstance(v, list) else v) for k, v in report.items()})
