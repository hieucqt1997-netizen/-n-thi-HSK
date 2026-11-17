# Báo cáo xử lý dữ liệu từ vựng HSK 1–6

Nguồn đầu vào: 6 tệp PDF anh cung cấp (HSK1–4: bản 新HSK词汇（汉语-英语）; HSK5–6: bản in burningvocabulary.com).
Đối chiếu: danh sách tham chiếu complete-hsk-vocabulary (MIT), từ điển Hán–Việt CVDICT (CC BY-SA 4.0, tác giả Phong Phan).
Danh sách chi tiết: `du-lieu/bao_cao.json`. Toàn bộ từ vựng để rà soát trong Excel: `du-lieu/tu-vung-hsk1-6.csv`.

## Kết quả cuối

| Cấp | Số từ | Số bài | Nghĩa Việt | Câu ví dụ | Bài tập sinh sẵn |
|---|---|---|---|---|---|
| HSK 1 | 150 | 15 | soạn tay | 216 | sắp xếp 192, nghe câu 213, đọc hiểu 224, ngữ pháp/khác 16 |
| HSK 2 | 151 | 16 | soạn tay | 186 | sắp xếp 124, nghe câu 184, đọc hiểu 186 |
| HSK 3 | 296 | 20 | tự động 294, soạn tay 2 | 345 | sắp xếp 177, nghe câu 343, đọc hiểu 0 |
| HSK 4 | 597 | 30 | tự động 594, soạn tay 3 | 669 | sắp xếp 288, nghe câu 666, đọc hiểu 0 |
| HSK 5 | 1245 | 50 | tự động 1236, soạn tay 9 | 0 | sắp xếp 0, nghe câu 0, đọc hiểu 0 |
| HSK 6 | 2497 | 100 | tự động 2475, soạn tay 22 | 0 | sắp xếp 0, nghe câu 0, đọc hiểu 0 |

Tổng 4.936 mục từ (so với 5.000 dòng gốc: bỏ 58 từ trùng giữa hai nguồn, tách 3 chữ có hai cách đọc, bổ sung 1 từ bị thiếu số).

## Lỗi đã sửa tự động

- **Ký tự bộ thủ Khang Hy** trong tệp HSK5–6: 464 dòng (tệp HSK5) và 891 dòng (tệp HSK6) dùng ký tự bộ thủ (vd. `⼼` U+2F3C) thay cho chữ Hán thường → đã chuẩn hóa. Riêng `⼜` (bộ 又) bị tệp dùng nhầm cho chữ **口** (港口, 可口, 口气…) → đã sửa thành 口.
- **Dòng bảng PDF bị lệch/tràn trang** ở HSK1–4: đọc lại theo đường kẻ bảng nên tách đúng từng nghĩa và ví dụ (kể cả từ dài như 公共汽车, mẫu câu 虽然……但是……).
- **Dấu thanh đặt sai nguyên âm**: HSK4 排球: páiqíu → páiqiú; HSK4 实在: shízaì → shízài.
- **Bổ sung**: Bổ sung 当 (dāng) vào HSK4 — tệp gốc thiếu số 677.
- **Câu ví dụ**: thay ký hiệu ～ bằng từ cần học; sinh pinyin cho câu (pinyin chuẩn của từ HSK + pypinyin, có biến điệu 一/不 và âm 儿). Pinyin câu là tự động, có thể sai ở chữ đa âm.

### Bỏ khỏi HSK5–6 vì đã có ở HSK1–4 (hai nguồn dùng hai phiên bản danh sách) (58)


- 棒 (bàng) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 包子 (bāozi) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 比如 (bǐrú) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 不好意思 (bùhǎoyìsi) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 餐厅 (cāntīng) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 厕所 (cèsuǒ) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 存 (cún) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 错误 (cuòwù) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 打招呼 (dǎzhāohu) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 倒 (dào) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 登机牌 (dēngjīpái) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 短信 (duǎnxìn) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 房东 (fángdōng) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 放松 (fàngsōng) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 费用 (fèiyong) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 付款 (fùkuǎn) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 高速公路 (gāosùgōnglù) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 功夫 (gōngfu) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 国籍 (guójí) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 建议 (jiànyì) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 降落 (jiàngluò) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 郊区 (jiāoqū) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 节 (jié) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 接着 (jiēzhe) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 景色 (jǐngsè) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 举 (jǔ) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 聚会 (jùhuì) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 开心 (kāixīn) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 客厅 (kètīng) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 矿泉水 (kuàngquánshuǐ) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 来自 (láizì) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 礼拜天 (lǐbàitiān) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 离婚 (líhūn) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 零钱 (língqián) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 毛 (máo) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 迷路 (mílù) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 秒 (miǎo) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 排队 (páiduì) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 排球 (páiqiú) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 皮鞋 (píxié) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 勺子 (sháozi) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 是否 (shìfǒu) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 提 (tí) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 卫生间 (wèishēngjiān) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 现金 (xiànjīn) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 橡皮 (xiàngpí) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 小吃 (xiǎochī) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 信封 (xìnfēng) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 信息 (xìnxī) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 要是 (yàoshi) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 应聘 (yìngpìn) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 邮局 (yóujú) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 占线 (zhànxiàn) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 重 (zhòng) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 自信 (zìxìn) — đã có ở HSK 1–4, bỏ khỏi HSK5
- 互联网 (hùliánwǎng) — đã có ở HSK 1–4, bỏ khỏi HSK6
- 修理 (xiūlǐ) — đã có ở HSK 1–4, bỏ khỏi HSK6
- 左右 (zuǒyòu) — đã có ở HSK 1–4, bỏ khỏi HSK6

### Cùng chữ, khác âm — giữ thành mục riêng (3)


- 过 guò
- 还 huán
- 只 zhǐ

### Pinyin khác âm so với từ điển — giữ theo tệp, cần giáo viên xem (4)
系领带 jì và 嗯 ńg là cách đọc đúng trong ngữ cảnh; 泄露 chuẩn là xièlù.

- HSK5 系领带: tệp «jìlǐngdài» / từ điển «xìlǐngdài»
- HSK6 嗯: tệp «ńg» / từ điển «ēn»
- HSK6 纽扣儿: tệp «niǔkòur» / từ điển «niǔkòu'er»
- HSK6 泄露: tệp «xièlòu» / từ điển «xièlù»

### Pinyin khác ở biến điệu hoặc thanh nhẹ — giữ theo tệp, app chấp nhận cả hai khi gõ (82)


- HSK1 不客气: tệp «bú kèqi» / từ điển «bùkèqi»
- HSK1 后面: tệp «hòumiàn» / từ điển «hòumian»
- HSK1 小姐: tệp «xiǎojiě» / từ điển «xiǎojie»
- HSK1 一点儿: tệp «yìdiǎnr» / từ điển «yīdiǎnr»
- HSK2 一起: tệp «yìqǐ» / từ điển «yīqǐ»
- HSK3 关系: tệp «guānxì» / từ điển «guānxi»
- HSK3 还是: tệp «háishì» / từ điển «háishi»
- HSK3 太阳: tệp «tàiyáng» / từ điển «tàiyang»
- HSK3 一定: tệp «yídìng» / từ điển «yīdìng»
- HSK3 一共: tệp «yígòng» / từ điển «yīgòng»
- HSK3 一会儿: tệp «yíhuìr» / từ điển «yīhuìr»
- HSK3 一样: tệp «yíyàng» / từ điển «yīyàng»
- HSK3 一般: tệp «yìbān» / từ điển «yībān»
- HSK3 一边: tệp «yìbiān» / từ điển «yībiān»
- HSK3 一直: tệp «yìzhí» / từ điển «yīzhí»
- HSK3 照顾: tệp «zhàogù» / từ điển «zhàogu»
- HSK4 不过: tệp «búguò» / từ điển «bùguò»
- HSK4 活泼: tệp «huópō» / từ điển «huópo»
- HSK4 起来: tệp «qǐlái» / từ điển «qǐlai»
- HSK4 受不了: tệp «shòubuliǎo» / từ điển «shòubùliǎo»
- HSK4 味道: tệp «wèidào» / từ điển «wèidao»
- HSK4 要是: tệp «yàoshì» / từ điển «yàoshi»
- HSK4 一切: tệp «yíqiè» / từ điển «yīqiè»
- HSK4 值得: tệp «zhídé» / từ điển «zhíde»
- HSK5 不必: tệp «búbì» / từ điển «bùbì»
- HSK5 不断: tệp «búduàn» / từ điển «bùduàn»
- HSK5 不见得: tệp «bújiàndé» / từ điển «bùjiànde»
- HSK5 不耐烦: tệp «búnàifán» / từ điển «bùnàifán»
- HSK5 不要紧: tệp «búyàojǐn» / từ điển «bùyàojǐn»
- HSK5 打交道: tệp «dǎjiāodao» / từ điển «dǎjiāodào»
- HSK5 道理: tệp «dàolǐ» / từ điển «dàoli»
- HSK5 费用: tệp «fèiyong» / từ điển «fèiyòng»
- HSK5 教训: tệp «jiàoxùn» / từ điển «jiàoxun»
- HSK5 看来: tệp «kànlái» / từ điển «kànlai»
- HSK5 力量: tệp «lìliàng» / từ điển «lìliang»
- HSK5 佩服: tệp «pèifu» / từ điển «pèifú»
- HSK5 位置: tệp «wèizhì» / từ điển «wèizhi»
- HSK5 下载: tệp «xiàzài» / từ điển «xiàzǎi»
- HSK5 小气: tệp «xiǎoqi» / từ điển «xiǎoqì»
- HSK5 孝顺: tệp «xiàoshun» / từ điển «xiàoshùn»
- HSK5 学问: tệp «xuéwen» / từ điển «xuéwèn»
- HSK5 一辈子: tệp «yíbèizi» / từ điển «yībèizi»
- HSK5 一旦: tệp «yídàn» / từ điển «yīdàn»
- HSK5 一路平安: tệp «yílùpíng'ān» / từ điển «yīlùpíng'ān»
- HSK5 一致: tệp «yízhì» / từ điển «yīzhì»
- HSK5 周到: tệp «zhōudao» / từ điển «zhōudào»
- HSK6 不顾: tệp «búgù» / từ điển «bùgù»
- HSK6 不愧: tệp «búkuì» / từ điển «bùkuì»
- HSK6 不料: tệp «búliào» / từ điển «bùliào»
- HSK6 不像话: tệp «búxiànghuà» / từ điển «bùxiànghuà»
- HSK6 不屑一顾: tệp «búxièyígù» / từ điển «bùxièyīgù»
- HSK6 伺候: tệp «cìhòu» / từ điển «cìhou»
- HSK6 大不了: tệp «dàbuliǎo» / từ điển «dàbùliǎo»
- HSK6 灯笼: tệp «dēnglong» / từ điển «dēnglóng»
- HSK6 动静: tệp «dòngjing» / từ điển «dòngjìng»
- HSK6 队伍: tệp «duìwu» / từ điển «duìwǔ»
- HSK6 恶心: tệp «ěxin» / từ điển «ěxīn»
- HSK6 分量: tệp «fènliàng» / từ điển «fēnliàng»
- HSK6 夫人: tệp «fūrén» / từ điển «fūren»
- HSK6 格式: tệp «géshi» / từ điển «géshì»
- HSK6 供不应求: tệp «gōngbúyìngqiú» / từ điển «gōngbùyìngqiú»
- HSK6 固执: tệp «gùzhi» / từ điển «gùzhí»
- HSK6 迷惑: tệp «míhuò» / từ điển «míhuo»
- HSK6 摸索: tệp «mōsuǒ» / từ điển «mōsuo»
- HSK6 情形: tệp «qíngxíng» / từ điển «qíngxing»
- HSK6 书记: tệp «shūjì» / từ điển «shūji»
- HSK6 爽快: tệp «shuǎngkuài» / từ điển «shuǎngkuai»
- HSK6 斯文: tệp «sīwen» / từ điển «sīwén»
- HSK6 无微不至: tệp «wúwēibúzhì» / từ điển «wúwēibùzhì»
- HSK6 媳妇: tệp «xífu» / từ điển «xífù»
- HSK6 要不然: tệp «yàoburán» / từ điển «yàobùrán»
- HSK6 一度: tệp «yídù» / từ điển «yīdù»
- HSK6 一帆风顺: tệp «yìfānfēngshùn» / từ điển «yīfānfēngshùn»
- HSK6 一贯: tệp «yíguàn» / từ điển «yīguàn»
- HSK6 一举两得: tệp «yìjǔliǎngdé» / từ điển «yījǔliǎngdé»
- HSK6 一律: tệp «yílǜ» / từ điển «yīlǜ»
- HSK6 一目了然: tệp «yímùliǎorán» / từ điển «yīmùliǎorán»
- HSK6 一如既往: tệp «yìrújìwǎng» / từ điển «yīrújìwǎng»
- HSK6 一丝不苟: tệp «yìsībùgǒu» / từ điển «yīsībùgǒu»
- HSK6 一向: tệp «yíxiàng» / từ điển «yīxiàng»
- HSK6 一再: tệp «yízài» / từ điển «yīzài»
- HSK6 正经: tệp «zhèngjing» / từ điển «zhèngjīng»

## Khác biệt giữa tệp của anh và danh sách tham chiếu (chỉ để biết, KHÔNG sửa)

Danh sách HSK 2.0 có nhiều bản in. Tệp HSK1–4 của anh khác bản tham chiếu ở 103 từ về cấp độ và một số dạng từ (vd. tệp ghi 饭店, 没有, 哪儿; bản kia ghi 饭馆, 没, 哪). App giữ nguyên theo tệp của anh.

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
