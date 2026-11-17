# Tách danh sách từ HSK 1–4 (bản "新HSK词汇（汉语-英语）").
# Dựa vào đường kẻ bảng trong PDF: đường kẻ ở cột số thứ tự = ranh giới từ,
# đường kẻ ở cột từ loại/nghĩa = ranh giới từng nghĩa. Bảng có thể tràn sang trang sau.
import pdfplumber, re, json, sys, unicodedata, collections

def parse(path):
    entries = []
    cur = None
    with pdfplumber.open(path) as pdf:
        for pi, page in enumerate(pdf.pages):
            segs = [(x['top'], x['x0']) for x in page.rects if x['height'] < 1 and x['width'] > 20]
            byx = collections.defaultdict(set)
            for t, x in segs: byx[round(x)].add(round(t, 1))
            xs = sorted(byx)
            if len(xs) < 6: continue
            xs = xs[:6]                                      # no | word | py | pos | en | ex
            entry_lines = sorted(byx[xs[0]])
            sense_lines = sorted(byx[xs[3]])
            def col(x):
                i = 0
                while i + 1 < len(xs) and x >= xs[i + 1] - 2: i += 1
                return ['no', 'word', 'py', 'pos', 'en', 'ex'][i]
            words = [w for w in page.extract_words() if entry_lines[0] - 2 < w['top'] < entry_lines[-1] + 2]
            if pi == 0:  # bỏ dòng tiêu đề bảng
                words = [w for w in words if w['top'] > entry_lines[1] - 1] if len(entry_lines) > 1 else words
                entry_lines = [t for t in entry_lines if t >= entry_lines[1]]
            for bi in range(len(entry_lines) - 1):
                top, bot = entry_lines[bi], entry_lines[bi + 1]
                inband = [w for w in words if top - 1 <= w['top'] < bot - 1]
                if not inband: continue
                c = collections.defaultdict(list)
                for w in sorted(inband, key=lambda w: (round(w['top']), w['x0'])): c[col(w['x0'])].append(w)
                no = ' '.join(w['text'] for w in c['no'])
                if re.fullmatch(r'\d+', no):
                    cur = {'no': int(no), 'word': '', 'py': '', 'senses': [], 'page': pi + 1}
                    entries.append(cur)
                elif cur is None:
                    continue
                cur['word'] += ''.join(w['text'] for w in c['word'])
                cur['py'] += (' ' if cur['py'] and c['py'] else '') + ' '.join(w['text'] for w in c['py'])
                # các nghĩa trong dải này
                sl = [t for t in sense_lines if top - 1 <= t <= bot + 1]
                if not sl or sl[0] > top + 1: sl = [top] + sl
                if sl[-1] < bot - 1: sl = sl + [bot]
                for si in range(len(sl) - 1):
                    st, sb = sl[si], sl[si + 1]
                    sw = [w for w in inband if st - 1 <= w['top'] < sb - 1 and col(w['x0']) in ('pos', 'en', 'ex')]
                    if not sw: continue
                    def txt(k, sep=' '): return sep.join(w['text'] for w in sorted([w for w in sw if col(w['x0']) == k], key=lambda w: (round(w['top']), w['x0'])))
                    s = {'pos': txt('pos'), 'en': txt('en'), 'ex': []}
                    exs = collections.OrderedDict()
                    for w in sorted([w for w in sw if col(w['x0']) == 'ex'], key=lambda w: (round(w['top']), w['x0'])):
                        exs.setdefault(round(w['top'] / 3), []).append(w['text'])
                    lines = [''.join(v) for v in exs.values()]
                    merged = []
                    for ln in lines:
                        if merged and not re.search(r'[。？！?!）)”"]$', merged[-1]): merged[-1] += ln
                        else: merged.append(ln)
                    s['ex'] = merged
                    # dải đầu trang không có số thứ tự và không có từ loại: là phần nghĩa tràn trang
                    if not s['pos'] and cur['senses'] and not re.fullmatch(r'\d+', no) and si == 0:
                        last = cur['senses'][-1]
                        last['en'] = (last['en'] + ' ' + s['en']).strip(); last['ex'] += s['ex']
                    else:
                        cur['senses'].append(s)
    for e in entries:
        e['word'] = unicodedata.normalize('NFKC', e['word'].replace('【', '').replace('】', '').strip())
    return entries

if __name__ == '__main__':
    es = parse(sys.argv[1])
    json.dump(es, open(sys.argv[2], 'w'), ensure_ascii=False, indent=0)
    print(sys.argv[1], len(es), 'entries; max no', max(e['no'] for e in es))
