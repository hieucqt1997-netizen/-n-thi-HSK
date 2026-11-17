# -*- coding: utf-8 -*-
"""Sinh packs/hsk1/pack.json từ dữ liệu soạn tay bên dưới.
Chạy: python tools/build_hsk1_pack.py   (từ thư mục gốc dự án)
Nội dung: TỰ BIÊN SOẠN cho mục đích tự học, không sao chép giáo trình/đề thi có bản quyền.
Cấp độ từ: theo danh sách HSK 2.0 cấp 1 (đều là từ cơ bản); CẦN đối chiếu với đề cương HSK 3.0 trước khi dùng cho kỳ thi mới.
"""
import json, os

LESSONS = {
    1: "Bài 1 · Chào hỏi",
    2: "Bài 2 · Giới thiệu bản thân",
    3: "Bài 3 · Số đếm và thời gian",
    4: "Bài 4 · Gia đình",
    5: "Bài 5 · Ăn uống, mua sắm",
    6: "Bài 6 · Nơi chốn, đi lại",
}
TOPIC = {1: "Giao tiếp", 2: "Bản thân", 3: "Thời gian", 4: "Gia đình", 5: "Mua sắm", 6: "Nơi chốn"}

# (id, hanzi, pinyin, nghĩa, từ loại, bài, ví dụ zh, ví dụ pinyin, ví dụ vi, từ dễ nhầm)
W = [
 ("ni","你","nǐ","bạn, anh, chị (ngôi thứ hai)","đại từ",1,"你好！","Nǐ hǎo!","Xin chào!","您"),
 ("hao","好","hǎo","tốt, khỏe, hay","tính từ",1,"我很好。","Wǒ hěn hǎo.","Tôi rất khỏe.",""),
 ("nin","您","nín","ngài, ông, bà (kính trọng)","đại từ",1,"您好！","Nín hǎo!","Chào ngài!","你"),
 ("wo","我","wǒ","tôi, mình","đại từ",1,"我是学生。","Wǒ shì xuésheng.","Tôi là học sinh.",""),
 ("ta_m","他","tā","anh ấy, ông ấy","đại từ",1,"他是我朋友。","Tā shì wǒ péngyou.","Anh ấy là bạn tôi.","她"),
 ("ta_f","她","tā","cô ấy, bà ấy","đại từ",1,"她是老师。","Tā shì lǎoshī.","Cô ấy là giáo viên.","他"),
 ("women","我们","wǒmen","chúng tôi, chúng ta","đại từ",1,"我们是同学。","Wǒmen shì tóngxué.","Chúng tôi là bạn học.",""),
 ("hen","很","hěn","rất","phó từ",1,"我很高兴。","Wǒ hěn gāoxìng.","Tôi rất vui.",""),
 ("xiexie","谢谢","xièxie","cảm ơn","động từ",1,"谢谢你！","Xièxie nǐ!","Cảm ơn bạn!",""),
 ("bukeqi","不客气","bú kèqi","đừng khách sáo, không có gì","cụm từ",1,"谢谢！——不客气。","Xièxie! — Bú kèqi.","Cảm ơn! — Không có gì.",""),
 ("zaijian","再见","zàijiàn","tạm biệt","động từ",1,"老师，再见！","Lǎoshī, zàijiàn!","Em chào thầy/cô ạ (tạm biệt)!",""),
 ("duibuqi","对不起","duìbuqǐ","xin lỗi","động từ",1,"对不起，我不认识他。","Duìbuqǐ, wǒ bú rènshi tā.","Xin lỗi, tôi không quen anh ấy.",""),
 ("meiguanxi","没关系","méi guānxi","không sao, không có gì","cụm từ",1,"对不起！——没关系。","Duìbuqǐ! — Méi guānxi.","Xin lỗi! — Không sao.",""),
 ("bu","不","bù","không (phủ định)","phó từ",1,"我不是老师。","Wǒ bú shì lǎoshī.","Tôi không phải giáo viên.","没"),

 ("shi","是","shì","là","động từ",2,"他是中国人。","Tā shì Zhōngguó rén.","Anh ấy là người Trung Quốc.",""),
 ("jiao","叫","jiào","gọi, tên là","động từ",2,"我叫王明。","Wǒ jiào Wáng Míng.","Tôi tên là Vương Minh.",""),
 ("shenme","什么","shénme","gì, cái gì","đại từ",2,"你叫什么名字？","Nǐ jiào shénme míngzi?","Bạn tên là gì?",""),
 ("mingzi","名字","míngzi","tên","danh từ",2,"你的名字是什么？","Nǐ de míngzi shì shénme?","Tên của bạn là gì?",""),
 ("zhongguo","中国","Zhōngguó","Trung Quốc","danh từ riêng",2,"我想去中国。","Wǒ xiǎng qù Zhōngguó.","Tôi muốn đi Trung Quốc.",""),
 ("ren","人","rén","người","danh từ",2,"你是哪国人？","Nǐ shì nǎ guó rén?","Bạn là người nước nào?","入"),
 ("laoshi","老师","lǎoshī","giáo viên, thầy/cô","danh từ",2,"她是汉语老师。","Tā shì Hànyǔ lǎoshī.","Cô ấy là giáo viên tiếng Trung.",""),
 ("xuesheng","学生","xuésheng","học sinh, sinh viên","danh từ",2,"我们都是学生。","Wǒmen dōu shì xuésheng.","Chúng tôi đều là học sinh.",""),
 ("tongxue","同学","tóngxué","bạn học","danh từ",2,"他是我的同学。","Tā shì wǒ de tóngxué.","Anh ấy là bạn học của tôi.",""),
 ("pengyou","朋友","péngyou","bạn bè","danh từ",2,"她是我的好朋友。","Tā shì wǒ de hǎo péngyou.","Cô ấy là bạn thân của tôi.",""),
 ("renshi","认识","rènshi","quen, quen biết (người)","động từ",2,"认识你很高兴。","Rènshi nǐ hěn gāoxìng.","Rất vui được làm quen với bạn.",""),
 ("gaoxing","高兴","gāoxìng","vui, vui mừng","tính từ",2,"今天我很高兴。","Jīntiān wǒ hěn gāoxìng.","Hôm nay tôi rất vui.",""),
 ("hanyu","汉语","Hànyǔ","tiếng Hán, tiếng Trung","danh từ",2,"我学习汉语。","Wǒ xuéxí Hànyǔ.","Tôi học tiếng Trung.",""),
 ("ma","吗","ma","(trợ từ nghi vấn cuối câu)","trợ từ",2,"你是老师吗？","Nǐ shì lǎoshī ma?","Bạn là giáo viên à?","妈"),
 ("shei","谁","shéi","ai","đại từ",2,"他是谁？","Tā shì shéi?","Anh ấy là ai?",""),
 ("de","的","de","của (trợ từ sở hữu)","trợ từ",2,"这是我的书。","Zhè shì wǒ de shū.","Đây là sách của tôi.",""),

 ("yi","一","yī","một","số từ",3,"我有一个朋友。","Wǒ yǒu yí gè péngyou.","Tôi có một người bạn.",""),
 ("er","二","èr","hai","số từ",3,"今天是二月一号。","Jīntiān shì èryuè yī hào.","Hôm nay là ngày 1 tháng 2.",""),
 ("san","三","sān","ba","số từ",3,"我家有三口人。","Wǒ jiā yǒu sān kǒu rén.","Nhà tôi có ba người.",""),
 ("shi_10","十","shí","mười","số từ",3,"我女儿十岁。","Wǒ nǚ'ér shí suì.","Con gái tôi mười tuổi.",""),
 ("ji","几","jǐ","mấy (hỏi số lượng nhỏ)","đại từ",3,"你家有几口人？","Nǐ jiā yǒu jǐ kǒu rén?","Nhà bạn có mấy người?","多少"),
 ("sui","岁","suì","tuổi","lượng từ",3,"你几岁了？","Nǐ jǐ suì le?","Con mấy tuổi rồi?",""),
 ("jintian","今天","jīntiān","hôm nay","danh từ",3,"今天星期几？","Jīntiān xīngqī jǐ?","Hôm nay thứ mấy?",""),
 ("mingtian","明天","míngtiān","ngày mai","danh từ",3,"明天我去学校。","Míngtiān wǒ qù xuéxiào.","Ngày mai tôi đến trường.",""),
 ("zuotian","昨天","zuótiān","hôm qua","danh từ",3,"昨天是星期一。","Zuótiān shì xīngqīyī.","Hôm qua là thứ Hai.",""),
 ("yue","月","yuè","tháng; mặt trăng","danh từ",3,"现在是十月。","Xiànzài shì shíyuè.","Bây giờ là tháng Mười.",""),
 ("hao_day","号","hào","ngày (trong tháng); số","danh từ",3,"今天几号？","Jīntiān jǐ hào?","Hôm nay ngày mấy?",""),
 ("xingqi","星期","xīngqī","tuần; thứ (trong tuần)","danh từ",3,"星期六我不去学校。","Xīngqīliù wǒ bú qù xuéxiào.","Thứ Bảy tôi không đến trường.",""),
 ("xianzai","现在","xiànzài","bây giờ","danh từ",3,"现在几点？","Xiànzài jǐ diǎn?","Bây giờ là mấy giờ?",""),
 ("dian","点","diǎn","giờ (giờ đồng hồ)","lượng từ",3,"现在三点。","Xiànzài sān diǎn.","Bây giờ là ba giờ.",""),

 ("jia","家","jiā","nhà, gia đình","danh từ",4,"我家在北京。","Wǒ jiā zài Běijīng.","Nhà tôi ở Bắc Kinh.",""),
 ("baba","爸爸","bàba","bố","danh từ",4,"我爸爸是医生。","Wǒ bàba shì yīshēng.","Bố tôi là bác sĩ.",""),
 ("mama","妈妈","māma","mẹ","danh từ",4,"妈妈在家。","Māma zài jiā.","Mẹ ở nhà.","吗"),
 ("erzi","儿子","érzi","con trai","danh từ",4,"他儿子三岁。","Tā érzi sān suì.","Con trai anh ấy ba tuổi.",""),
 ("nver","女儿","nǚ'ér","con gái","danh từ",4,"我有一个女儿。","Wǒ yǒu yí gè nǚ'ér.","Tôi có một con gái.",""),
 ("you","有","yǒu","có","động từ",4,"我有汉语书。","Wǒ yǒu Hànyǔ shū.","Tôi có sách tiếng Trung.",""),
 ("meiyou","没有","méiyǒu","không có; chưa","động từ",4,"我没有猫。","Wǒ méiyǒu māo.","Tôi không có mèo.","不"),
 ("ge","个","gè","cái, chiếc, người (lượng từ chung)","lượng từ",4,"我们学校有十个老师。","Wǒmen xuéxiào yǒu shí gè lǎoshī.","Trường chúng tôi có mười giáo viên.",""),
 ("kou","口","kǒu","(lượng từ đếm người trong nhà); miệng","lượng từ",4,"我家有三口人。","Wǒ jiā yǒu sān kǒu rén.","Nhà tôi có ba người.",""),
 ("gou","狗","gǒu","con chó","danh từ",4,"那是我的狗。","Nà shì wǒ de gǒu.","Đó là con chó của tôi.",""),
 ("mao","猫","māo","con mèo","danh từ",4,"我喜欢猫。","Wǒ xǐhuan māo.","Tôi thích mèo.",""),
 ("shu","书","shū","sách","danh từ",4,"这本书很好。","Zhè běn shū hěn hǎo.","Cuốn sách này rất hay.",""),

 ("chi","吃","chī","ăn","động từ",5,"你想吃什么？","Nǐ xiǎng chī shénme?","Bạn muốn ăn gì?",""),
 ("he","喝","hē","uống","động từ",5,"我想喝茶。","Wǒ xiǎng hē chá.","Tôi muốn uống trà.",""),
 ("shui","水","shuǐ","nước","danh từ",5,"我想喝水。","Wǒ xiǎng hē shuǐ.","Tôi muốn uống nước.",""),
 ("cha","茶","chá","trà","danh từ",5,"中国茶很好喝。","Zhōngguó chá hěn hǎohē.","Trà Trung Quốc rất ngon.",""),
 ("mifan","米饭","mǐfàn","cơm","danh từ",5,"我喜欢吃米饭。","Wǒ xǐhuan chī mǐfàn.","Tôi thích ăn cơm.",""),
 ("cai","菜","cài","món ăn; rau","danh từ",5,"这个菜很好吃。","Zhège cài hěn hǎochī.","Món này rất ngon.",""),
 ("xiang","想","xiǎng","muốn; nhớ; nghĩ","động từ",5,"我想去商店。","Wǒ xiǎng qù shāngdiàn.","Tôi muốn đi cửa hàng.",""),
 ("mai","买","mǎi","mua","động từ",5,"我想买一本书。","Wǒ xiǎng mǎi yì běn shū.","Tôi muốn mua một cuốn sách.","卖"),
 ("duoshao","多少","duōshao","bao nhiêu","đại từ",5,"这个多少钱？","Zhège duōshao qián?","Cái này bao nhiêu tiền?","几"),
 ("qian","钱","qián","tiền","danh từ",5,"这本书多少钱？","Zhè běn shū duōshao qián?","Cuốn sách này bao nhiêu tiền?",""),
 ("kuai","块","kuài","đồng (đơn vị tiền, khẩu ngữ); miếng","lượng từ",5,"十块钱。","Shí kuài qián.","Mười đồng.",""),
 ("xihuan","喜欢","xǐhuan","thích","động từ",5,"你喜欢喝茶吗？","Nǐ xǐhuan hē chá ma?","Bạn có thích uống trà không?",""),

 ("zai","在","zài","ở, tại; đang","động từ/giới từ",6,"我在学校。","Wǒ zài xuéxiào.","Tôi ở trường.",""),
 ("nar","哪儿","nǎr","ở đâu, chỗ nào","đại từ",6,"你家在哪儿？","Nǐ jiā zài nǎr?","Nhà bạn ở đâu?","那儿"),
 ("zhe","这","zhè","đây, này","đại từ",6,"这是什么？","Zhè shì shénme?","Đây là cái gì?","那"),
 ("na","那","nà","kia, đó","đại từ",6,"那是谁的书？","Nà shì shéi de shū?","Kia là sách của ai?","这"),
 ("xuexiao","学校","xuéxiào","trường học","danh từ",6,"学校在哪儿？","Xuéxiào zài nǎr?","Trường học ở đâu?",""),
 ("yiyuan","医院","yīyuàn","bệnh viện","danh từ",6,"爸爸在医院工作。","Bàba zài yīyuàn gōngzuò.","Bố làm việc ở bệnh viện.",""),
 ("shangdian","商店","shāngdiàn","cửa hàng","danh từ",6,"商店在学校前面。","Shāngdiàn zài xuéxiào qiánmiàn.","Cửa hàng ở phía trước trường.",""),
 ("qu","去","qù","đi (đến nơi nào đó)","động từ",6,"你去哪儿？","Nǐ qù nǎr?","Bạn đi đâu?","来"),
 ("lai","来","lái","đến, tới","động từ",6,"他明天来我家。","Tā míngtiān lái wǒ jiā.","Ngày mai anh ấy đến nhà tôi.","去"),
 ("hui","回","huí","về, trở về","động từ",6,"我想回家。","Wǒ xiǎng huí jiā.","Tôi muốn về nhà.",""),
 ("feiji","飞机","fēijī","máy bay","danh từ",6,"我坐飞机去北京。","Wǒ zuò fēijī qù Běijīng.","Tôi đi máy bay đến Bắc Kinh.",""),
 ("chuzuche","出租车","chūzūchē","xe taxi","danh từ",6,"我们坐出租车去医院。","Wǒmen zuò chūzūchē qù yīyuàn.","Chúng tôi đi taxi đến bệnh viện.",""),
]

def words():
    out = []
    for i, (wid, hz, py, vi, pos, les, ezh, epy, evi, conf) in enumerate(W):
        out.append({
            "id": "h1-" + wid, "hanzi": hz, "pinyin": py, "vi": vi, "pos": pos,
            "level": 1, "lesson": LESSONS[les], "lessonNo": les, "order": i, "topic": TOPIC[les],
            "ex": [{"zh": ezh, "py": epy, "vi": evi}],
            "confusable": [c for c in conf.split(",") if c], "audio": None,
        })
    return out

Q = []  # câu hỏi
def q(**kw):
    kw.setdefault("level", 1); kw.setdefault("difficulty", 1)
    Q.append(kw); return kw

G = []
def grammar(gid, title, pattern, explain, examples, compare, qs):
    G.append({"id": gid, "level": 1, "title": title, "pattern": pattern, "explain": explain,
              "examples": [{"zh": a, "py": b, "vi": c} for a, b, c in examples],
              "compare": compare, "questions": [x["id"] for x in qs]})

grammar("h1-g-shi", "Câu chữ 是 (A là B)", "A 是 B ／ A 不是 B",
 "是 nối hai danh từ/đại từ, nghĩa là “là”. Phủ định thêm 不 trước 是 (đọc bú shì). Lưu ý: không dùng 是 trước tính từ — nói 我很好, không nói 我是好.",
 [("我是学生。","Wǒ shì xuésheng.","Tôi là học sinh."),("他不是老师。","Tā bú shì lǎoshī.","Anh ấy không phải giáo viên.")],
 "Người Việt hay nói “tôi là khỏe” theo thói quen → sai. Tính từ đứng sau 很: 我很好.",
 [q(id="h1-q-shi-1", skill="grammar", type="choice", prompt="Chọn câu đúng:", options=["我是很好。","我很好。","我好是。"], answer=1, zhOptions=True,
    explain="Trước tính từ dùng 很, không dùng 是.", tags={"grammar":"h1-g-shi"}),
  q(id="h1-q-shi-2", skill="grammar", type="fill", input="hanzi", prompt="Điền vào chỗ trống (Anh ấy không phải giáo viên, anh ấy là học sinh):<br><span class='zh'>他＿＿老师，他是学生。</span>", answer="不是",
    explain="Phủ định của 是 là 不是.", tags={"grammar":"h1-g-shi"}),
  q(id="h1-q-shi-3", skill="writing", type="order", prompt="Sắp xếp thành câu: “Tôi là học sinh.”", tokens=["是","我","学生"], answer="我是学生",
    explain="Chủ ngữ + 是 + danh từ.", tags={"grammar":"h1-g-shi"})])

grammar("h1-g-ma", "Câu hỏi với 吗", "Câu trần thuật + 吗？",
 "Thêm 吗 vào cuối câu trần thuật để tạo câu hỏi có/không. Trả lời bằng cách lặp lại động từ: 是／不是, 有／没有, 喜欢／不喜欢.",
 [("你是老师吗？","Nǐ shì lǎoshī ma?","Bạn là giáo viên à?"),("你喜欢喝茶吗？","Nǐ xǐhuan hē chá ma?","Bạn có thích uống trà không?")],
 "Câu đã có từ để hỏi (什么, 谁, 哪儿, 几, 多少) thì KHÔNG thêm 吗.",
 [q(id="h1-q-ma-1", skill="grammar", type="choice", prompt="Đặt 吗 đúng chỗ cho câu “你是中国人”:", options=["吗你是中国人？","你是中国人吗？","你吗是中国人？"], answer=1, zhOptions=True,
    explain="吗 luôn đứng cuối câu.", tags={"grammar":"h1-g-ma"}),
  q(id="h1-q-ma-2", skill="grammar", type="choice", prompt="Câu nào SAI?", options=["你喜欢猫吗？","你叫什么名字吗？","他是老师吗？"], answer=1, zhOptions=True, difficulty=2,
    explain="Đã có 什么 thì không thêm 吗: 你叫什么名字？", tags={"grammar":"h1-g-ma"})])

grammar("h1-g-yiwen", "Đại từ nghi vấn: 什么, 谁, 哪儿, 几, 多少", "Giữ nguyên trật tự câu, thay phần cần hỏi bằng từ để hỏi",
 "Khác tiếng Anh, tiếng Trung không đảo từ để hỏi lên đầu câu. Muốn hỏi phần nào thì thay phần đó bằng từ để hỏi: 他是老师 → 他是谁？ 你去学校 → 你去哪儿？",
 [("你叫什么名字？","Nǐ jiào shénme míngzi?","Bạn tên là gì?"),("你家有几口人？","Nǐ jiā yǒu jǐ kǒu rén?","Nhà bạn có mấy người?"),("这本书多少钱？","Zhè běn shū duōshao qián?","Cuốn sách này bao nhiêu tiền?")],
 "几 dùng khi đoán số nhỏ (thường dưới 10) và phải có lượng từ: 几口人. 多少 dùng cho số lớn hoặc không đoán được, lượng từ có thể lược: 多少钱, 多少学生.",
 [q(id="h1-q-yw-1", skill="grammar", type="choice", prompt="<span class='zh'>你家有＿＿口人？</span>", options=["几","多少","什么"], answer=0, zhOptions=True,
    explain="Số người trong nhà là số nhỏ, có lượng từ 口 → dùng 几.", tags={"grammar":"h1-g-yiwen"}),
  q(id="h1-q-yw-2", skill="grammar", type="choice", prompt="<span class='zh'>这本书＿＿钱？</span>", options=["几","多少","谁"], answer=1, zhOptions=True,
    explain="Hỏi giá tiền dùng 多少钱.", tags={"grammar":"h1-g-yiwen"}),
  q(id="h1-q-yw-3", skill="writing", type="order", prompt="Sắp xếp thành câu: “Bạn đi đâu?”", tokens=["哪儿","你","去"], answer="你去哪儿",
    explain="Không đảo từ để hỏi: 你去哪儿？", tags={"grammar":"h1-g-yiwen"}),
  q(id="h1-q-yw-4", skill="grammar", type="choice", prompt="Hỏi “Anh ấy là ai?”:", options=["谁是他吗？","他是谁？","他谁是？"], answer=1, zhOptions=True, difficulty=2,
    explain="Thay 老师 trong 他是老师 bằng 谁, không thêm 吗.", tags={"grammar":"h1-g-yiwen"})])

grammar("h1-g-de", "Trợ từ sở hữu 的", "Người sở hữu + 的 + vật/người",
 "的 tương đương “của” nhưng đứng TRƯỚC danh từ, trật tự ngược tiếng Việt: 我的书 = sách của tôi. Với người thân, đơn vị gần gũi có thể bỏ 的: 我妈妈, 我家, 我们学校.",
 [("这是我的书。","Zhè shì wǒ de shū.","Đây là sách của tôi."),("她是我的同学。","Tā shì wǒ de tóngxué.","Cô ấy là bạn học của tôi.")],
 "Tiếng Việt: sách CỦA tôi (vật trước). Tiếng Trung: 我的书 (người sở hữu trước).",
 [q(id="h1-q-de-1", skill="grammar", type="fill", input="hanzi", prompt="Điền vào chỗ trống (Đây là sách của tôi):<br><span class='zh'>这是＿＿书。</span>", answer="我的",
    explain="我 + 的 + 书.", tags={"grammar":"h1-g-de"}),
  q(id="h1-q-de-2", skill="grammar", type="choice", prompt="Cách nói tự nhiên của “mẹ tôi”:", options=["我妈妈","妈妈我","妈妈的我"], answer=0, zhOptions=True,
    explain="Quan hệ gia đình có thể bỏ 的: 我妈妈.", tags={"grammar":"h1-g-de"})])

grammar("h1-g-you", "Câu chữ 有 / 没有", "Chủ ngữ + 有 + tân ngữ ／ 没有",
 "有 = có. Phủ định của 有 luôn là 没有 (hoặc 没), KHÔNG dùng 不有.",
 [("我有一个女儿。","Wǒ yǒu yí gè nǚ'ér.","Tôi có một con gái."),("我没有猫。","Wǒ méiyǒu māo.","Tôi không có mèo.")],
 "不有 là lỗi rất hay gặp của người mới học.",
 [q(id="h1-q-you-1", skill="grammar", type="choice", prompt="Câu nào đúng?", options=["我不有狗。","我没有狗。","我没狗有。"], answer=1, zhOptions=True,
    explain="Phủ định của 有 là 没有.", tags={"grammar":"h1-g-you"}),
  q(id="h1-q-you-2", skill="writing", type="order", prompt="Sắp xếp thành câu: “Tôi có một con gái.”", tokens=["有","我","一个","女儿"], answer="我有一个女儿",
    explain="Chủ ngữ + 有 + số + lượng từ + danh từ.", tags={"grammar":"h1-g-you"})])

grammar("h1-g-zai", "在 + nơi chốn", "Chủ ngữ + 在 + nơi chốn ／ 在 + nơi chốn + động từ",
 "在 chỉ vị trí: 妈妈在家 (mẹ ở nhà). Khi có hành động, cụm 在 + nơi chốn đứng TRƯỚC động từ: 爸爸在医院工作 (bố làm việc ở bệnh viện) — ngược với tiếng Việt.",
 [("我在学校。","Wǒ zài xuéxiào.","Tôi ở trường."),("爸爸在医院工作。","Bàba zài yīyuàn gōngzuò.","Bố làm việc ở bệnh viện.")],
 "Tiếng Việt: làm việc Ở bệnh viện. Tiếng Trung: 在医院工作 (nơi chốn trước động từ).",
 [q(id="h1-q-zai-1", skill="grammar", type="choice", prompt="<span class='zh'>妈妈＿＿家。</span> (Mẹ ở nhà)", options=["是","在","有"], answer=1, zhOptions=True,
    explain="Chỉ vị trí dùng 在.", tags={"grammar":"h1-g-zai"}),
  q(id="h1-q-zai-2", skill="writing", type="order", prompt="Sắp xếp thành câu: “Bố làm việc ở bệnh viện.”", tokens=["在","医院","工作","爸爸"], answer="爸爸在医院工作", difficulty=2,
    explain="在 + nơi chốn đứng trước động từ.", tags={"grammar":"h1-g-zai"})])

grammar("h1-g-liang", "Số + lượng từ + danh từ", "Số + 个/口/本… + danh từ",
 "Giữa số và danh từ phải có lượng từ: 一个人, 三口人 (người trong nhà), 一本书. 个 là lượng từ chung dùng nhiều nhất.",
 [("我有一个朋友。","Wǒ yǒu yí gè péngyou.","Tôi có một người bạn."),("我家有三口人。","Wǒ jiā yǒu sān kǒu rén.","Nhà tôi có ba người.")],
 "Trước lượng từ, “hai” dùng 两 chứ không dùng 二 (两 thuộc từ vựng HSK 2): 两个人.",
 [q(id="h1-q-lt-1", skill="grammar", type="choice", prompt="“Tôi có một cuốn sách.”", options=["我有一书。","我有一本书。","我有书一本。"], answer=1, zhOptions=True,
    explain="Phải có lượng từ 本 giữa số và danh từ.", tags={"grammar":"h1-g-liang"}),
  q(id="h1-q-lt-2", skill="grammar", type="choice", prompt="<span class='zh'>我家有四＿＿人。</span>", options=["个","口","本"], answer=1, zhOptions=True, difficulty=2,
    explain="Đếm người trong gia đình dùng 口.", tags={"grammar":"h1-g-liang"})])

grammar("h1-g-bumei", "Phủ định: 不 và 没(有)", "不 + động từ/tính từ ／ 没(有) + động từ",
 "不: phủ định ý muốn, thói quen, hiện tại, tương lai, và phủ định 是. 没(有): phủ định 有 và phủ định việc đã xảy ra.",
 [("我不是老师。","Wǒ bú shì lǎoshī.","Tôi không phải giáo viên."),("明天我不去学校。","Míngtiān wǒ bú qù xuéxiào.","Ngày mai tôi không đến trường."),("我没有钱。","Wǒ méiyǒu qián.","Tôi không có tiền.")],
 "不是 ✓ / 没是 ✗；没有 ✓ / 不有 ✗.",
 [q(id="h1-q-bm-1", skill="grammar", type="choice", prompt="<span class='zh'>我＿＿是老师。</span>", options=["不","没"], answer=0, zhOptions=True,
    explain="Phủ định 是 dùng 不.", tags={"grammar":"h1-g-bumei"}),
  q(id="h1-q-bm-2", skill="grammar", type="choice", prompt="<span class='zh'>我＿＿有钱。</span>", options=["不","没"], answer=1, zhOptions=True,
    explain="Phủ định 有 dùng 没.", tags={"grammar":"h1-g-bumei"}),
  q(id="h1-q-bm-3", skill="grammar", type="choice", prompt="<span class='zh'>明天我＿＿去学校。</span>", options=["不","没"], answer=0, zhOptions=True, difficulty=2,
    explain="Việc tương lai/ý định phủ định bằng 不.", tags={"grammar":"h1-g-bumei"})])

# Luyện viết
WRITING = [
 q(id="h1-q-w-1", skill="writing", type="order", prompt="Sắp xếp thành câu: “Rất vui được làm quen với bạn.”", tokens=["很","认识","高兴","你"], answer="认识你很高兴", explain="认识你 + 很高兴."),
 q(id="h1-q-w-2", skill="writing", type="fill", input="hanzi", prompt="Gõ chữ Hán của từ: <b>cảm ơn</b>", answer="谢谢", explain="谢谢 xièxie."),
 q(id="h1-q-w-3", skill="writing", type="fill", input="pinyin", checkTones=True, prompt="Gõ pinyin có thanh điệu cho: <span class='zh'>朋友</span><br><small>Có thể gõ dấu (péngyou) hoặc số (peng2you)</small>", answer="péngyou", explain="朋友 péngyou — 友 đọc thanh nhẹ."),
 q(id="h1-q-w-4", skill="writing", type="fill", input="pinyin", checkTones=True, prompt="Gõ pinyin có thanh điệu cho: <span class='zh'>学校</span>", answer="xuéxiào", explain="学校 xuéxiào (thanh 2 + thanh 4)."),
 q(id="h1-q-w-5", skill="writing", type="fill", input="hanzi", prompt="Gõ chữ Hán: <b>bệnh viện</b>", answer="医院", explain="医院 yīyuàn."),
 q(id="h1-q-w-6", skill="writing", type="open", prompt="Viết một câu giới thiệu tên và quốc tịch của bạn.",
   answer="我叫阮文安，我是越南人。", criteria=["Có dùng 叫 hoặc 是 để nói tên","Có câu …是…人 để nói quốc tịch","Chữ Hán viết đúng, có dấu câu tiếng Trung"],
   explain="Đáp án mẫu: 我叫阮文安，我是越南人。(越南 Yuènán = Việt Nam)"),
 q(id="h1-q-w-7", skill="writing", type="open", prompt="Dùng từ 喜欢 viết một câu nói về sở thích ăn uống.",
   answer="我喜欢喝茶。", criteria=["Có 喜欢 + động từ/danh từ","Trật tự: Chủ ngữ + 喜欢 + …","Câu có dấu chấm 。"], explain="Ví dụ: 我喜欢喝茶。我喜欢吃米饭。"),
]

READINGS = []
def reading(rid, title, topic, text, py, vi, qs):
    for x in qs: x["passage"] = rid
    READINGS.append({"id": rid, "level": 1, "title": title, "topic": topic, "text": text, "pinyin": py, "vi": vi, "questions": [x["id"] for x in qs]})

reading("h1-r-1", "Bạn học mới", "Bản thân",
 "你好！我叫李月。我是中国人，我是学生。这是我的同学，她叫阮兰。她不是中国人，她是越南人。认识她，我很高兴。",
 "Nǐ hǎo! Wǒ jiào Lǐ Yuè. Wǒ shì Zhōngguó rén, wǒ shì xuésheng. Zhè shì wǒ de tóngxué, tā jiào Ruǎn Lán. Tā bú shì Zhōngguó rén, tā shì Yuènán rén. Rènshi tā, wǒ hěn gāoxìng.",
 "Xin chào! Tôi tên là Lý Nguyệt. Tôi là người Trung Quốc, tôi là học sinh. Đây là bạn học của tôi, cô ấy tên là Nguyễn Lan. Cô ấy không phải người Trung Quốc, cô ấy là người Việt Nam. Quen cô ấy, tôi rất vui.",
 [q(id="h1-q-r1-1", skill="reading", type="choice", prompt="<span class='zh'>李月是＿＿。</span>", options=["老师","学生","医生"], answer=1, zhOptions=True, explain="我是学生。"),
  q(id="h1-q-r1-2", skill="reading", type="choice", prompt="<span class='zh'>阮兰是中国人吗？</span>", options=["是","不是"], answer=1, zhOptions=True, explain="她不是中国人，她是越南人。")])

reading("h1-r-2", "Gia đình tôi", "Gia đình",
 "我家有三口人：爸爸、妈妈和我。爸爸是医生，他在医院工作。妈妈是汉语老师，她在学校工作。我是学生。我很喜欢我的家。",
 "Wǒ jiā yǒu sān kǒu rén: bàba, māma hé wǒ. Bàba shì yīshēng, tā zài yīyuàn gōngzuò. Māma shì Hànyǔ lǎoshī, tā zài xuéxiào gōngzuò. Wǒ shì xuésheng. Wǒ hěn xǐhuan wǒ de jiā.",
 "Nhà tôi có ba người: bố, mẹ và tôi. Bố là bác sĩ, bố làm việc ở bệnh viện. Mẹ là giáo viên tiếng Trung, mẹ làm việc ở trường. Tôi là học sinh. Tôi rất yêu gia đình mình.",
 [q(id="h1-q-r2-1", skill="reading", type="choice", prompt="<span class='zh'>爸爸在哪儿工作？</span>", options=["学校","医院","商店"], answer=1, zhOptions=True, explain="他在医院工作。"),
  q(id="h1-q-r2-2", skill="reading", type="choice", prompt="<span class='zh'>妈妈是＿＿。</span>", options=["医生","学生","汉语老师"], answer=2, zhOptions=True, explain="妈妈是汉语老师。"),
  q(id="h1-q-r2-3", skill="reading", type="choice", prompt="<span class='zh'>他家有几口人？</span>", options=["三口","四口","五口"], answer=0, zhOptions=True, explain="我家有三口人。")])

reading("h1-r-3", "Đi mua sắm", "Mua sắm",
 "今天是星期六。我和朋友去商店买东西。我想买一本汉语书，朋友想买茶。这本书三十块钱，茶二十块钱。买了东西，我们坐出租车回家。",
 "Jīntiān shì xīngqīliù. Wǒ hé péngyou qù shāngdiàn mǎi dōngxi. Wǒ xiǎng mǎi yì běn Hànyǔ shū, péngyou xiǎng mǎi chá. Zhè běn shū sānshí kuài qián, chá èrshí kuài qián. Mǎi le dōngxi, wǒmen zuò chūzūchē huí jiā.",
 "Hôm nay là thứ Bảy. Tôi và bạn đi cửa hàng mua đồ. Tôi muốn mua một cuốn sách tiếng Trung, bạn tôi muốn mua trà. Cuốn sách này 30 đồng, trà 20 đồng. Mua đồ xong, chúng tôi đi taxi về nhà.",
 [q(id="h1-q-r3-1", skill="reading", type="choice", prompt="<span class='zh'>今天星期几？</span>", options=["星期一","星期六","星期三"], answer=1, zhOptions=True, explain="今天是星期六。"),
  q(id="h1-q-r3-2", skill="reading", type="choice", prompt="<span class='zh'>书多少钱？</span>", options=["二十块","三十块","十块"], answer=1, zhOptions=True, explain="这本书三十块钱。"),
  q(id="h1-q-r3-3", skill="reading", type="choice", prompt="<span class='zh'>他们怎么回家？</span>", options=["坐飞机","坐出租车","在学校"], answer=1, zhOptions=True, difficulty=2, explain="我们坐出租车回家。")])

LISTEN = []
def listening(lid, title, lines, vi, qs):
    for x in qs: x["listen"] = lid
    LISTEN.append({"id": lid, "level": 1, "title": title, "lines": [{"who": a, "zh": b, "py": c} for a, b, c in lines],
                   "transcript": " ".join(a + "：" + b for a, b, c in lines), "vi": vi, "audio": None, "tts": True,
                   "questions": [x["id"] for x in qs]})

listening("h1-l-1", "Hỏi tên", [("女","你好，你叫什么名字？","Nǐ hǎo, nǐ jiào shénme míngzi?"),("男","我叫王明。","Wǒ jiào Wáng Míng.")],
 "Nữ: Chào bạn, bạn tên là gì? — Nam: Tôi tên là Vương Minh.",
 [q(id="h1-q-l1", skill="listening", type="listen-choice", prompt="<span class='zh'>男的叫什么名字？</span>", options=["李月","王明","王月"], answer=1, zhOptions=True, explain="我叫王明。")])
listening("h1-l-2", "Gia đình mấy người", [("男","你家有几口人？","Nǐ jiā yǒu jǐ kǒu rén?"),("女","我家有三口人。","Wǒ jiā yǒu sān kǒu rén.")],
 "Nam: Nhà bạn có mấy người? — Nữ: Nhà tôi có ba người.",
 [q(id="h1-q-l2", skill="listening", type="listen-choice", prompt="<span class='zh'>女的家有几口人？</span>", options=["两口","三口","四口"], answer=1, zhOptions=True, explain="我家有三口人。")])
listening("h1-l-3", "Hỏi giá", [("女","这本书多少钱？","Zhè běn shū duōshao qián?"),("男","三十块。","Sānshí kuài.")],
 "Nữ: Cuốn sách này bao nhiêu tiền? — Nam: Ba mươi đồng.",
 [q(id="h1-q-l3", skill="listening", type="listen-choice", prompt="<span class='zh'>这本书多少钱？</span>", options=["十三块","三十块","四十块"], answer=1, zhOptions=True, difficulty=2, explain="三十块 (sānshí), khác 十三 (shísān).")])
listening("h1-l-4", "Ngày mai đi đâu", [("男","你明天去哪儿？","Nǐ míngtiān qù nǎr?"),("女","我去医院看我妈妈。","Wǒ qù yīyuàn kàn wǒ māma.")],
 "Nam: Ngày mai bạn đi đâu? — Nữ: Tôi đi bệnh viện thăm mẹ.",
 [q(id="h1-q-l4", skill="listening", type="listen-choice", prompt="<span class='zh'>女的明天去哪儿？</span>", options=["学校","商店","医院"], answer=2, zhOptions=True, explain="我去医院看我妈妈。")])

def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ws = words()
    for x in Q: x["packId"] = "hsk1-core"
    pack = {
        "format": "sotay-hsk-pack", "formatVersion": 1,
        "id": "hsk1-core", "level": 1, "version": "1.0.0",
        "title": "HSK 1 · Gói cơ bản (tự biên soạn)",
        "hskVersion": "hsk2", "hskVersionNote": "Từ vựng chọn từ danh sách HSK 2.0 cấp 1. Chưa đối chiếu đề cương HSK 3.0 (áp dụng cho kỳ thi từ 13/12/2026 theo thông tin công bố) — trạng thái: CẦN KIỂM TRA.",
        "source": "Tự biên soạn cho Sổ tay HSK. Câu ví dụ, bài đọc, hội thoại nghe đều tự viết; không sao chép giáo trình hay đề thi.",
        "license": "Dùng cá nhân. Người dùng tự chịu trách nhiệm khi phân phối lại.",
        "reviewed": "Rà soát bởi người soạn (AI), chưa qua giáo viên. Nên nhờ giáo viên kiểm tra lại.",
        "words": ws, "grammar": G, "readings": READINGS, "listening": LISTEN,
        "questions": Q, "audioFiles": [],
    }
    for g in G: g["packId"] = pack["id"]
    for r in READINGS: r["packId"] = pack["id"]
    for l in LISTEN: l["packId"] = pack["id"]
    for w in ws: w["packId"] = pack["id"]
    out = os.path.join(root, "packs", "hsk1", "pack.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    s = json.dumps(pack, ensure_ascii=False, indent=1)
    open(out, "w", encoding="utf-8").write(s)
    print("words", len(ws), "grammar", len(G), "readings", len(READINGS), "listening", len(LISTEN), "questions", len(Q), "bytes", len(s.encode()))

if __name__ == "__main__":
    main()
