# -*- coding: utf-8 -*-
"""Bước 3: hoàn thiện nghĩa tiếng Việt, chia bài, sinh bài tập và xuất 6 gói cho app.
Vào: out/words_stage2.json, data/vi_hsk12.txt, data/vi_bo_sung.txt, gói HSK1 cũ (ngữ pháp/đọc/nghe tự soạn)
Ra : ../sotay-hsk/packs/hsk{1..6}/pack.json, packs/index.json, out/bao_cao.json, out/tu-vung-hsk1-6.csv
"""
import json, re, collections, unicodedata, random, csv, os, math
from util import py_key
import stage2_helpers as H

random.seed(20261117)
APP = '/home/claude/sotay-hsk'
words = json.load(open('out/words_stage2.json'))
report = json.load(open('out/bao_cao_stage2.json'))

# ---------- 1. Từ loại ----------
POSFIX = {'động từ năng nguyện': None}
RAWPOS = {'vm.': 'lượng từ (động lượng)', 'nm./vm.': 'lượng từ', 'sv.': 'động từ ly hợp', 'adj': 'tính từ'}
for w in words:
    for s in w['senses']:
        if s['pos'] in RAWPOS: s['pos'] = RAWPOS[s['pos']]

# ---------- 2. Nghĩa tiếng Việt HSK 1–2 (soạn tay) ----------
manual = {}
for line in open('data/vi_hsk12.txt', encoding='utf-8'):
    line = line.rstrip('\n')
    if not line or line.startswith('#'): continue
    key, vi, exvi = (line.split('|') + ['', ''])[:3]
    reading = None
    if '@' in key: key, reading = key.split('@')
    hz, idx = key.rsplit('#', 1)
    manual[(hz, int(idx), reading)] = (vi.strip(), [x.strip() for x in exvi.split(' / ')] if exvi.strip() else [])
used = set()
for w in words:
    if w['level'] > 2: continue
    got = False
    for i, s in enumerate(w['senses']):
        k = (w['hanzi'], i, w['pinyin']) if (w['hanzi'], i, w['pinyin']) in manual else (w['hanzi'], i, None)
        if (w['hanzi'], i, w['pinyin']) not in manual and w['hanzi'] in ('过', '还') and w['pinyin'] in ('guò', 'huán'):
            continue
        if k in manual:
            vi, exvi = manual[k]; used.add(k); got = True
            s['vi'] = vi
            for j, e in enumerate(s['ex']):
                if j < len(exvi): e['vi'] = exvi[j]
    if got:
        seen = []
        for s in w['senses']:
            if s.get('vi') and s['vi'] not in seen: seen.append(s['vi'])
        w['vi'] = '; '.join(seen)
        w['viSrc'] = 'manual'
    else:
        report.setdefault('hsk12_chua_dich_tay', []).append(w['hanzi'])
report['dong_dich_tay_khong_dung'] = [f'{k}' for k in manual if k not in used]

# ---------- 3. Nghĩa tiếng Việt HSK 3–6: CVDICT, chọn nghĩa khớp với nghĩa tiếng Anh của tài liệu ----------
bosung = {}
for line in open('data/vi_bo_sung.txt', encoding='utf-8'):
    line = line.strip()
    if line and not line.startswith('#'):
        hz, vi = line.split('|', 1); bosung[hz] = vi.strip()
for w in words:
    if w['level'] <= 2: continue
    if w['hanzi'] in bosung:
        w['vi'], w['viSrc'] = bosung[w['hanzi']], 'manual'
        continue
    vi = H.best_vi(w)
    if vi: w['vi'], w['viSrc'] = vi, 'cvdict'
    else: report.setdefault('khong_nghia_viet', []).append(w['hanzi'])

# ---------- 4. Ví dụ phẳng, ID cũ, chia bài ----------
SIZE = {1: 10, 2: 10, 3: 15, 4: 20, 5: 25, 6: 25}
by_level = collections.defaultdict(list)
for w in words: by_level[w['level']].append(w)
lessons = {}
for L, ws in by_level.items():
    ws.sort(key=lambda w: (w['freq'], w['hanzi']))
    n = SIZE[L]
    total = math.ceil(len(ws) / n)
    for i, w in enumerate(ws):
        no = i // n + 1
        w['lessonNo'] = no
        w['lesson'] = f'HSK {L} · Bài {no:0{len(str(total))}d}'
        w['order'] = i
    lessons[L] = total

# ---------- 5. Bài tập sinh từ câu ví dụ ----------
all_ex = collections.defaultdict(list)  # level -> [(word, ex)]
for w in words:
    for s in w['senses']:
        for e in s['ex']: all_ex[w['level']].append((w, e))
questions = collections.defaultdict(list)
def qid(*p): return 'q-' + '-'.join(str(x) for x in p)
for L, items in all_ex.items():
    sents = [e for _, e in items]
    for k, (w, e) in enumerate(items):
        zh = e['zh']
        dialog = bool(re.search(r'[甲乙]：', zh))
        tag = {'word': w['id']}
        # (a) Sắp xếp câu: 3–7 mảnh, không phải hội thoại
        ot = None if dialog else H.order_tokens(zh)
        if ot:
            toks, ans = ot
            sh = toks[:]
            for _ in range(10):
                random.shuffle(sh)
                if sh != toks: break
            questions[L].append({'id': qid('ord', w['id'], k), 'level': L, 'skill': 'writing', 'type': 'order', 'lesson': w['lesson'],
                'prompt': 'Sắp xếp thành câu đúng' + (f": “{e['vi']}”" if e.get('vi') else ':'),
                'tokens': sh, 'answer': ans, 'accept': [zh],
                'explain': f"{zh} — {e['py']}" + (f" ({e['vi']})" if e.get('vi') else ''), 'tags': tag, 'difficulty': 1 if len(toks) <= 4 else 2})
        # (b) Nghe câu, chọn câu đúng (cần giọng đọc hoặc audio)
        others = [s['zh'] for s in random.sample(sents, min(len(sents), 12)) if s['zh'] != zh and abs(len(s['zh']) - len(zh)) < 8][:3]
        if len(others) == 3 and not dialog:
            opts = others + [zh]; random.shuffle(opts)
            questions[L].append({'id': qid('ls', w['id'], k), 'level': L, 'skill': 'listening', 'type': 'listen-choice', 'lesson': w['lesson'],
                'prompt': 'Nghe và chọn câu bạn nghe được:', 'options': opts, 'answer': opts.index(zh), 'zhOptions': True,
                'lines': [{'zh': zh, 'py': e['py']}], 'explain': f"{zh} — {e['py']}" + (f" ({e['vi']})" if e.get('vi') else ''), 'tags': tag, 'difficulty': 2})
        # (c) Đọc hiểu câu: chọn nghĩa đúng (chỉ khi có bản dịch)
        if e.get('vi'):
            pool = [x['vi'] for _, x in items if x.get('vi') and x['vi'] != e['vi']]
            if len(pool) >= 3:
                opts = random.sample(pool, 3) + [e['vi']]; random.shuffle(opts)
                questions[L].append({'id': qid('rd', w['id'], k), 'level': L, 'skill': 'reading', 'type': 'choice', 'lesson': w['lesson'],
                    'prompt': f"<span class='zh'>{zh}</span><br>Câu trên có nghĩa là gì?", 'options': opts, 'answer': opts.index(e['vi']),
                    'explain': f"{e['py']}", 'tags': tag, 'difficulty': 1})

# ---------- 6. Gói HSK1 cũ: giữ ngữ pháp, bài đọc, bài nghe tự soạn; đổi ID từ ----------
old = json.load(open(f'{APP}/packs/hsk1/pack.json'))
if old.get('version', '').startswith('1.'):
    json.dump(old, open('data/hsk1_tu_soan_v1.json', 'w'), ensure_ascii=False)
old = json.load(open('data/hsk1_tu_soan_v1.json'))
newid = {}
for ow in old['words']:
    cand = [w for w in words if w['hanzi'] == ow['hanzi'] and py_key(w['pinyin'])[0] == py_key(ow['pinyin'])[0]]
    if cand: newid[ow['id']] = cand[0]['id']
report['hsk1_cu_doi_id'] = f"{len(newid)}/{len(old['words'])} từ của gói cũ khớp được sang ID mới"
legacy_qs = []
for q in old['questions']:
    q = dict(q)
    if q.get('tags', {}).get('word'): q['tags'] = {**q['tags'], 'word': newid.get(q['tags']['word'])}
    q['legacyIds'] = True
    legacy_qs.append(q)

# ---------- 7. Xuất gói ----------
def strip_word(w):
    ex = [{'zh': e['zh'], 'py': e['py'], 'vi': e.get('vi', '')} for s in w['senses'] for e in s['ex']]
    pos = '; '.join(dict.fromkeys(s['pos'] for s in w['senses'] if s['pos']))
    o = {'id': w['id'], 'hanzi': w['hanzi'], 'pinyin': w['pinyin'], 'vi': w.get('vi', ''), 'viSrc': w.get('viSrc', ''),
         'pos': pos, 'level': w['level'], 'lesson': w['lesson'], 'lessonNo': w['lessonNo'], 'order': w['order'],
         'senses': [{'pos': s['pos'], 'en': s['en'], 'vi': s.get('vi', '')} for s in w['senses']], 'ex': ex,
         'hsk3': w.get('hsk3'), 'audio': None}
    if w.get('pinyinRef'): o['pinyinAlt'] = w['pinyinRef']
    if w.get('alt'): o['variant'] = w['alt']
    return o

LEGACY_MAP = dict(newid)
index = {'format': 'sotay-hsk-index', 'updated': '2026-11-17', 'packs': []}
stats = {}
for L in range(1, 7):
    ws = sorted(by_level[L], key=lambda w: w['order'])
    pack = {'format': 'sotay-hsk-pack', 'formatVersion': 2, 'id': f'hsk{L}-core', 'level': L, 'version': '2.0.0',
            'title': f'HSK {L} · {len(ws)} từ, {lessons[L]} bài',
            'hskVersion': 'hsk2',
            'hskVersionNote': 'Danh sách từ HSK 2.0 (6 cấp) theo tài liệu người dùng cung cấp. Trường hsk3 ghi cấp tương ứng trong danh sách HSK 3.0 (bản sửa đổi) theo kho complete-hsk-vocabulary — chỉ để tham khảo.',
            'source': ('Từ, từ loại, nghĩa tiếng Anh, câu ví dụ: tệp 新HSK词汇（汉语-英语）.' if L <= 4 else 'Từ và nghĩa tiếng Anh: bản in burningvocabulary.com (tệp người dùng cung cấp).')
                      + ' Nghĩa tiếng Việt: ' + ('soạn tay.' if L <= 2 else 'CVDICT (CC BY-SA 4.0, Phong Phan), tự động chọn nghĩa khớp — cần rà soát.')
                      + (' Pinyin câu ví dụ: sinh tự động (pypinyin + danh sách từ).' if L <= 4 else ''),
            'license': 'Dùng cá nhân. Nghĩa tiếng Việt lấy từ CVDICT theo giấy phép CC BY-SA 4.0. Không phân phối lại danh sách HSK 5–6 khi chưa rõ quyền.',
            'reviewed': 'HSK 1–2: nghĩa và bản dịch câu do Claude soạn, cần giáo viên rà lại. HSK 3–6: nghĩa tiếng Việt tự động.',
            'words': [strip_word(w) for w in ws], 'grammar': [], 'readings': [], 'listening': [], 'questions': questions[L], 'audioFiles': [],
            'lessons': [{'no': i + 1, 'title': f'HSK {L} · Bài {i + 1:0{len(str(lessons[L]))}d}'} for i in range(lessons[L])],
            'migrate': {'byHanzi': True}}
    if L == 1:
        pack['grammar'] = old['grammar']; pack['readings'] = old['readings']; pack['listening'] = old['listening']
        pack['questions'] = questions[1] + legacy_qs
        pack['migrate']['idMap'] = LEGACY_MAP
        pack['title'] += ', 8 mẫu ngữ pháp, 3 bài đọc, 4 bài nghe'
    for g in pack['grammar'] + pack['readings'] + pack['listening'] + pack['questions']: g['packId'] = pack['id']
    for w in pack['words']: w['packId'] = pack['id']
    out = f'{APP}/packs/hsk{L}/pack.json'
    os.makedirs(os.path.dirname(out), exist_ok=True)
    s = json.dumps(pack, ensure_ascii=False, separators=(',', ':'))
    open(out, 'w', encoding='utf-8').write(s)
    cq = collections.Counter(q['skill'] for q in pack['questions'])
    stats[L] = {'tu': len(ws), 'bai': lessons[L], 'vi_dung_tay': sum(1 for w in ws if w.get('viSrc') == 'manual'), 'vi_tu_dong': sum(1 for w in ws if w.get('viSrc') == 'cvdict'),
                'khong_vi': sum(1 for w in ws if not w.get('vi')), 'vi_du': sum(len(s['ex']) for w in ws for s in w['senses']), 'cau_hoi': dict(cq), 'kb': round(len(s.encode()) / 1024)}
    index['packs'].append({'id': pack['id'], 'level': L, 'title': pack['title'], 'version': pack['version'], 'url': f'packs/hsk{L}/pack.json', 'status': 'available', 'bytes': len(s.encode())})
json.dump(index, open(f'{APP}/packs/index.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
report['thong_ke_goi'] = stats
json.dump(report, open('out/bao_cao.json', 'w'), ensure_ascii=False, indent=1)

# Bảng tổng hợp để rà soát/sửa trong Excel
with open('out/tu-vung-hsk1-6.csv', 'w', newline='', encoding='utf-8-sig') as f:
    wr = csv.writer(f)
    wr.writerow(['id', 'hanzi', 'pinyin', 'meaning_vi', 'pos', 'level', 'lesson', 'topic', 'example_zh', 'example_pinyin', 'example_vi', 'confusable', 'audio', 'note', 'nghia_tieng_anh', 'nguon_nghia_viet', 'cap_hsk3_tham_khao', 'pinyin_tu_dien'])
    for L in range(1, 7):
        for w in sorted(by_level[L], key=lambda w: w['order']):
            e = next((e for s in w['senses'] for e in s['ex']), {'zh': '', 'py': '', 'vi': ''})
            wr.writerow([w['id'], w['hanzi'], w['pinyin'], w.get('vi', ''), '; '.join(dict.fromkeys(s['pos'] for s in w['senses'] if s['pos'])), L, w['lesson'], '',
                         e['zh'], e['py'], e.get('vi', ''), '', '', '', ' | '.join(s['en'] for s in w['senses']), w.get('viSrc', ''), w.get('hsk3') or '', w.get('pinyinRef', '')])
print(json.dumps(stats, ensure_ascii=False, indent=0))
print('chưa dịch tay HSK1–2:', report.get('hsk12_chua_dich_tay'), '| dòng dịch thừa:', report['dong_dich_tay_khong_dung'][:10], '| không nghĩa Việt:', report.get('khong_nghia_viet'))
print(report['hsk1_cu_doi_id'])
