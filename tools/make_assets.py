# Sinh packs/index.json, config/hsk-versions.json, mẫu nhập và biểu tượng. Chạy từ thư mục gốc.
import json,os
idx={"format":"sotay-hsk-index","updated":"2026-11-17","packs":[
 {"id":"hsk1-core","level":1,"title":"HSK 1 · Gói cơ bản (tự biên soạn)","version":"1.0.0","url":"packs/hsk1/pack.json","status":"available","bytes":os.path.getsize("packs/hsk1/pack.json")}]+
 [{"id":f"hsk{l}-core","level":l,"title":f"HSK {l}","status":"none","note":"Chưa có dữ liệu. Có thể tự nhập bằng CSV/JSON trong Cá nhân → Quản lý nội dung."} for l in range(2,7)]}
json.dump(idx,open("packs/index.json","w",encoding="utf-8"),ensure_ascii=False,indent=1)
cfg={"note":"Cấu hình phiên bản HSK và bài kiểm tra. Sửa tệp này để thêm/đổi phiên bản mà không phải sửa mã.",
 "versions":[
  {"id":"hsk2","name":"HSK 2.0 (6 cấp)","status":"Đang được thay thế","note":"Theo các nguồn đã tra (chưa đối chiếu trực tiếp chinesetest.cn): các kỳ thi thường kỳ năm 2026 trước tháng 12 dùng HSK 2.0.",
   "official":{"1":{"listening":20,"reading":20,"minutes":40,"verified":False,"note":"20 câu nghe + 20 câu đọc, khoảng 40 phút — theo hiểu biết chung, CHƯA xác minh nguồn chính thức."}}},
  {"id":"hsk3","name":"HSK 3.0 (9 cấp)","status":"Chưa có cấu hình đề","note":"Kỳ thi chính thức HSK 3.0 cấp 1–6 được công bố từ 13/12/2026; cấp 3–6 có thi nói kèm. Cấu trúc đề chưa nhập vào ứng dụng.",
   "official":{}}],
 "practiceTests":{"1":{"title":"Kiểm tra tổng hợp HSK 1 (tự biên soạn)","minutes":20,
   "sections":[{"id":"listen","name":"Nghe","count":4,"source":"listening"},{"id":"vocab","name":"Từ vựng","count":10,"source":"vocab"},
               {"id":"grammar","name":"Ngữ pháp","count":6,"source":"q:grammar"},{"id":"read","name":"Đọc hiểu","count":5,"source":"q:reading"}]}},
 "fullMock":{"note":"Đề mô phỏng đủ chuẩn chỉ mở khi cấu trúc đề đã xác minh và ngân hàng đủ số câu, loại câu.","minBank":{"1":{"listening":20,"reading":20}}}}
json.dump(cfg,open("config/hsk-versions.json","w",encoding="utf-8"),ensure_ascii=False,indent=1)
csv='''id,hanzi,pinyin,meaning_vi,pos,level,lesson,topic,example_zh,example_pinyin,example_vi,confusable,audio,note
my-pingguo,苹果,píngguǒ,quả táo,danh từ,1,Từ tự nhập,Ăn uống,我喜欢吃苹果。,Wǒ xǐhuan chī píngguǒ.,Tôi thích ăn táo.,,,
my-yifu,衣服,yīfu,quần áo,danh từ,1,Từ tự nhập,Mua sắm,这件衣服很漂亮。,Zhè jiàn yīfu hěn piàoliang.,Bộ quần áo này rất đẹp.,,,"Ví dụ có từ HSK 2+, chỉ để minh họa"
'''
open("templates/tu-vung-mau.csv","w",encoding="utf-8-sig").write(csv)
tpl={"format":"sotay-hsk-pack","formatVersion":1,"id":"my-pack-1","level":2,"version":"1.0.0","title":"Gói tự soạn mẫu",
 "hskVersion":"hsk3","source":"Tự biên soạn","license":"Dùng cá nhân",
 "words":[{"id":"my2-yifu","hanzi":"衣服","pinyin":"yīfu","vi":"quần áo","pos":"danh từ","level":2,"lesson":"Bài 1","topic":"Mua sắm",
   "ex":[{"zh":"我想买衣服。","py":"Wǒ xiǎng mǎi yīfu.","vi":"Tôi muốn mua quần áo."}],"confusable":[],"audio":"yifu.mp3"}],
 "grammar":[{"id":"my2-g-1","level":2,"title":"Tên mẫu câu","pattern":"A + 比 + B + tính từ","explain":"Giải thích bằng tiếng Việt.","examples":[{"zh":"…","py":"…","vi":"…"}],"compare":"","questions":["my2-q-1"]}],
 "readings":[],
 "listening":[{"id":"my2-l-1","level":2,"title":"Bài nghe mẫu","audio":"bai1.mp3","transcript":"女：……","lines":[{"who":"女","zh":"……","py":""}],"vi":"Bản dịch","questions":["my2-q-2"]}],
 "questions":[
  {"id":"my2-q-1","level":2,"skill":"grammar","type":"choice","prompt":"Câu hỏi…","options":["A","B","C"],"answer":0,"explain":"Giải thích","difficulty":1},
  {"id":"my2-q-2","level":2,"skill":"listening","type":"listen-choice","listen":"my2-l-1","prompt":"Câu hỏi nghe…","options":["A","B","C"],"answer":1,"explain":""},
  {"id":"my2-q-3","level":2,"skill":"writing","type":"fill","input":"pinyin","checkTones":True,"prompt":"Gõ pinyin của 衣服","answer":"yīfu","accept":["yi1fu"],"explain":""},
  {"id":"my2-q-4","level":2,"skill":"writing","type":"order","prompt":"Sắp xếp","tokens":["买","我","衣服","想"],"answer":"我想买衣服","explain":""}],
 "audioFiles":["yifu.mp3","bai1.mp3"],
 "_huong_dan":"Chọn tệp JSON này CÙNG các tệp MP3 có tên trong audioFiles khi nhập. Loại câu: choice, listen-choice, fill (input: hanzi|pinyin), order (tokens), open (tự đánh giá)."}
json.dump(tpl,open("templates/goi-bai-hoc-mau.json","w",encoding="utf-8"),ensure_ascii=False,indent=1)
from PIL import Image, ImageDraw, ImageFont
F='/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc'
def icon(sz,path):
    im=Image.new('RGB',(sz,sz),'#B8322A'); d=ImageDraw.Draw(im)
    d.text((sz/2,sz*0.45),'汉',font=ImageFont.truetype(F,int(sz*0.55)),fill='#FFF6E8',anchor='mm')
    d.text((sz/2,sz*0.84),'HSK',font=ImageFont.truetype(F,int(sz*0.14)),fill='#FFF6E8',anchor='mm')
    im.save(path)
icon(192,'icons/icon-192.png');icon(512,'icons/icon-512.png');icon(180,'icons/apple-touch-icon.png')
