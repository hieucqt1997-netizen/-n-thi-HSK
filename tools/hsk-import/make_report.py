import json
r=json.load(open('out/bao_cao.json'))
def sec(title,key,note=''):
    v=r.get(key,[])
    return f"\n### {title} ({len(v)})\n{note}\n\n"+'\n'.join('- '+x for x in v)+'\n'
md="""# Báo cáo xử lý dữ liệu từ vựng HSK 1–6

Nguồn đầu vào: 6 tệp PDF anh cung cấp (HSK1–4: bản 新HSK词汇（汉语-英语）; HSK5–6: bản in burningvocabulary.com).
Đối chiếu: danh sách tham chiếu complete-hsk-vocabulary (MIT), từ điển Hán–Việt CVDICT (CC BY-SA 4.0, tác giả Phong Phan).
Danh sách chi tiết: `du-lieu/bao_cao.json`. Toàn bộ từ vựng để rà soát trong Excel: `du-lieu/tu-vung-hsk1-6.csv`.

## Kết quả cuối

| Cấp | Số từ | Số bài | Nghĩa Việt | Câu ví dụ | Bài tập sinh sẵn |
|---|---|---|---|---|---|
"""
for L,v in r['thong_ke_goi'].items():
    cq=v['cau_hoi']
    nv='soạn tay' if int(L)<=2 else 'tự động %d, soạn tay %d' % (v['vi_tu_dong'], v['vi_dung_tay'])
    extra=(', ngữ pháp/khác %d' % cq['grammar']) if cq.get('grammar') else ''
    md+="| HSK %s | %d | %d | %s | %d | sắp xếp %d, nghe câu %d, đọc hiểu %d%s |\n" % (L,v['tu'],v['bai'],nv,v['vi_du'],cq.get('writing',0),cq.get('listening',0),cq.get('reading',0),extra)
md+="""
Tổng 4.936 mục từ (so với 5.000 dòng gốc: bỏ 58 từ trùng giữa hai nguồn, tách 3 chữ có hai cách đọc, bổ sung 1 từ bị thiếu số).

## Lỗi đã sửa tự động

- **Ký tự bộ thủ Khang Hy** trong tệp HSK5–6: 464 dòng (tệp HSK5) và 891 dòng (tệp HSK6) dùng ký tự bộ thủ (vd. `⼼` U+2F3C) thay cho chữ Hán thường → đã chuẩn hóa. Riêng `⼜` (bộ 又) bị tệp dùng nhầm cho chữ **口** (港口, 可口, 口气…) → đã sửa thành 口.
- **Dòng bảng PDF bị lệch/tràn trang** ở HSK1–4: đọc lại theo đường kẻ bảng nên tách đúng từng nghĩa và ví dụ (kể cả từ dài như 公共汽车, mẫu câu 虽然……但是……).
- **Dấu thanh đặt sai nguyên âm**: """+'; '.join(r['sua_vi_tri_dau_thanh'])+""".
- **Bổ sung**: """+'; '.join(r['sua_tay'])+""".
- **Câu ví dụ**: thay ký hiệu ～ bằng từ cần học; sinh pinyin cho câu (pinyin chuẩn của từ HSK + pypinyin, có biến điệu 一/不 và âm 儿). Pinyin câu là tự động, có thể sai ở chữ đa âm.
"""
md+=sec('Bỏ khỏi HSK5–6 vì đã có ở HSK1–4 (hai nguồn dùng hai phiên bản danh sách)','bo_trung_cap_5_6')
md+=sec('Cùng chữ, khác âm — giữ thành mục riêng','cung_chu_khac_am_1_4')
md+=sec('Pinyin khác âm so với từ điển — giữ theo tệp, cần giáo viên xem','pinyin_khac_am','系领带 jì và 嗯 ńg là cách đọc đúng trong ngữ cảnh; 泄露 chuẩn là xièlù.')
md+=sec('Pinyin khác ở biến điệu hoặc thanh nhẹ — giữ theo tệp, app chấp nhận cả hai khi gõ','pinyin_bien_dieu_hoac_thanh_nhe')
md+="""
## Khác biệt giữa tệp của anh và danh sách tham chiếu (chỉ để biết, KHÔNG sửa)

Danh sách HSK 2.0 có nhiều bản in. Tệp HSK1–4 của anh khác bản tham chiếu ở %d từ về cấp độ và một số dạng từ (vd. tệp ghi 饭店, 没有, 哪儿; bản kia ghi 饭馆, 没, 哪). App giữ nguyên theo tệp của anh.

## Nghĩa tiếng Việt

- **HSK 1–2 (301 từ, 398 nghĩa, 402 câu ví dụ)**: Claude soạn tay từng nghĩa và dịch từng câu ví dụ. Cần giáo viên đọc lại.
- **HSK 3–6**: lấy từ CVDICT, chọn nghĩa khớp với nghĩa tiếng Anh của tài liệu, làm sạch ký hiệu thừa. Các từ CVDICT không có được soạn tay (`tools/hsk-import/data/vi_bo_sung.txt`). App gắn nhãn **"nghĩa tự động"**; anh sửa được ngay trên app (ô "Nghĩa của bạn").
- Câu ví dụ HSK 3–4 **chưa có bản dịch tiếng Việt**; tài liệu HSK 5–6 **không có câu ví dụ**.

## Cấp HSK 3.0 (tham khảo)

Mỗi từ có nhãn "HSK 3.0: cấp …" lấy từ kho tham chiếu (danh sách HSK 3.0 bản sửa đổi). Chưa đối chiếu trực tiếp đề cương chính thức.

## Chạy lại quy trình

```
cd tools/hsk-import
pip install pdfplumber pypinyin jieba
# tải CVDICT và complete-hsk-vocabulary (GitHub) vào thư mục ext/
python build_all.py && python stage2.py && python stage3.py
```
""" % len(r['lech_cap'])
open('/home/claude/sotay-hsk/BAO-CAO-DU-LIEU.md','w').write(md)
