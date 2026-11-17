import unicodedata
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

