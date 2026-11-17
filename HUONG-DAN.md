# Sổ tay tiếng Trung HSK — Hướng dẫn sử dụng và bàn giao (bản 1.0.0)

Ứng dụng web cài lên Màn hình chính (PWA), ưu tiên iPhone. Không cần tài khoản, không có máy chủ lưu dữ liệu, không dùng AI hay dịch vụ trả phí. Sau khi cài và tải gói học, app chạy được khi mất mạng.

---

## 1. Kiến trúc đã chọn và lý do

| | A. PWA (đã chọn) | B. App đóng gói (App Store / TestFlight) |
|---|---|---|
| Phân phối | Một trang web tĩnh qua HTTPS (GitHub Pages… miễn phí) | Cần tài khoản Apple Developer (99 USD/năm), máy Mac, Xcode |
| Cài trên iPhone | Safari → Chia sẻ → Thêm vào MH chính | App Store / TestFlight |
| Offline | Có, sau lần mở và tải gói đầu tiên | Có ngay từ khi cài |
| Lưu trữ | IndexedDB trong máy; iOS **có thể** dọn khi thiếu bộ nhớ → cần sao lưu | Bền hơn |
| Âm thanh | Phát sau khi chạm; không nghe nền khi khóa máy | Đầy đủ hơn |

Hai điểm cần phân biệt:
- **Không cần backend ≠ không cần nơi phân phối.** App không có máy chủ xử lý hay lưu dữ liệu, nhưng iPhone vẫn cần tải mã app một lần từ một địa chỉ HTTPS. Hosting tĩnh miễn phí là đủ.
- **Offline sau lần tải đầu ≠ cài không cần Internet.** Lần đầu phải có mạng để mở app, lưu bộ đệm và tải gói học. Sau đó app chạy khi mất mạng.

Service worker (thành phần giúp chạy offline) **chỉ hoạt động trên HTTPS hoặc `localhost`**. Nếu mở `index.html` bằng cách nhấp đúp (`file://`), app vẫn hiện ra nhưng tự báo “Chế độ offline chưa bật”. Ở chế độ đó không cài được và không mở lại được khi mất mạng.

## 2. Chạy thử trên máy tính Windows (không cần đưa lên mạng)

1. Cài Python từ python.org. Khi cài, đánh dấu ô **Add Python to PATH**.
2. Giải nén thư mục `sotay-hsk`. Mở thư mục đó, gõ `cmd` vào thanh địa chỉ rồi nhấn Enter.
3. Gõ lệnh: `python -m http.server 8080`
4. Mở Chrome hoặc Edge, vào **http://localhost:8080**. Có thể cài thành app qua biểu tượng ⊕ trên thanh địa chỉ.

Cách này chỉ dùng được trên chính máy tính đó. iPhone không mở được `localhost` của máy tính.

## 3. Đưa lên mạng miễn phí để dùng trên iPhone (GitHub Pages)

1. Tạo tài khoản miễn phí tại github.com.
2. Bấm **New repository**, đặt tên ví dụ `sotay-hsk`, chọn **Public**, rồi bấm Create.
3. Bấm **uploading an existing file**. Kéo **toàn bộ nội dung bên trong** thư mục `sotay-hsk` vào (`index.html` phải nằm ở cấp ngoài cùng), rồi bấm **Commit changes**.
4. Vào **Settings → Pages → Branch: main / (root) → Save**. Đợi 1–2 phút để có địa chỉ dạng `https://tên-bạn.github.io/sotay-hsk/`.

Lưu ý: repository Public thì ai có đường link cũng xem được **mã và gói học**. Tiến độ học **không** nằm trên mạng mà chỉ ở trong máy bạn. Cũng có thể dùng Cloudflare Pages hoặc Netlify (đều có gói miễn phí).

## 4. Cài lên iPhone và thử offline

1. Mở **Safari**, vào địa chỉ ở bước 3.
2. Bấm nút **Chia sẻ** (ô vuông có mũi tên) → **Thêm vào MH chính** → Thêm.
3. **Mở app từ biểu tượng trên Màn hình chính** (không mở bằng tab Safari). Từ đây trở đi chỉ dùng biểu tượng này, vì dữ liệu của app trên Màn hình chính có thể tách riêng với tab Safari.
4. Vào **Cá nhân → Gói nội dung & dung lượng → HSK 1 → Tải về máy**.
5. Bấm **Kiểm tra đủ để học offline**. Kết quả cần báo cả hai dòng: “Nội dung gói đầy đủ” và “Khung ứng dụng đã lưu offline”.
6. Bật **Chế độ máy bay**, vuốt tắt hẳn app rồi mở lại từ biểu tượng. Thử học vài thẻ.

### Giọng đọc tiếng Trung (dùng cho phần nghe)

Gói HSK 1 hiện **chưa có tệp audio người đọc**. Phần nghe dùng giọng đọc có sẵn của iPhone. Cách cài giọng đọc:

- Vào **Cài đặt → Trợ năng → Nội dung được đọc → Giọng nói → Tiếng Trung (Trung Quốc đại lục)**, tải một giọng về máy.
- Sau đó vào app: **Cá nhân → Thử giọng đọc**.

Nếu máy không có giọng tiếng Trung, app ghi rõ điều đó và khóa nút Phát. Câu nghe trong bài thi thử cũng bị bỏ ra. App không làm nút phát giả. Âm thanh chỉ phát sau khi bạn chạm nút, vì iOS chặn tự phát. Khóa màn hình hoặc chuyển sang app khác thì âm thanh dừng.

Gõ chữ Hán: Cài đặt → Cài đặt chung → Bàn phím → Thêm bàn phím mới → **Tiếng Trung giản thể – Bính âm**.

## 5. Sao lưu, khôi phục, chuyển máy

- **Cá nhân → Sao lưu & khôi phục → Tạo tệp sao lưu → Lưu vào Tệp / Chia sẻ.** Nên chọn iCloud Drive. Tệp gồm lịch ôn, lỗi sai, lịch sử thi, ghi chú, cài đặt, từ và bài nghe tự tạo.
- **Khôi phục**: chọn tệp `.json`. App kiểm tra định dạng và phiên bản trước, rồi cho chọn:
  - **Gộp**: giữ bản mới hơn của từng mục.
  - **Thay thế**: có hỏi xác nhận trước khi ghi đè.
- **Chuyển sang máy khác**: sao lưu ở máy cũ → trên máy mới, tải gói HSK → khôi phục. App **không tự đồng bộ** giữa các máy.
- Trang Hôm nay tự nhắc sao lưu sau 7 ngày. Có thể đổi số ngày trong Cá nhân.
- Dữ liệu **có thể mất** nếu: xóa app khỏi Màn hình chính, xóa dữ liệu website trong Cài đặt Safari, hoặc iOS dọn bộ nhớ khi máy đầy. Vì vậy cần sao lưu định kỳ.

## 6. Cập nhật app

1. Sửa mã, sau đó tăng số phiên bản ở **hai chỗ**: `APP_VERSION` trong `sw.js` và trong `js/app.js` (ví dụ 1.0.0 → 1.0.1).
2. Tải các tệp mới lên GitHub (Upload files, ghi đè tệp cũ).
3. Trên iPhone, lần mở app tiếp theo khi có mạng sẽ hiện thông báo **“Có phiên bản mới”**. Bấm **Cập nhật**. Cũng có thể chủ động kiểm tra ở Cá nhân → Kiểm tra cập nhật.

Khi cập nhật, app chỉ xóa bộ đệm mã cũ. **Không xóa IndexedDB**, nên tiến độ học được giữ nguyên (đã kiểm thử). App không tự cập nhật lúc bạn đang làm bài.

Cập nhật gói học: tăng `version` trong `packs/index.json` và trong tệp gói. Trong mục Gói nội dung sẽ hiện nút “Cập nhật lên vX”. Tiến độ tự khớp lại vì ID của từ không đổi.

## 7. Nhập nội dung

**Cá nhân → Quản lý nội dung**:

- **Thêm từ** bằng biểu mẫu. Có thể sửa hoặc xóa từ tự tạo.
- **CSV từ vựng**: dùng mẫu `templates/tu-vung-mau.csv`. Khi lưu bằng Excel, chọn kiểu “CSV UTF-8”.
  - Cột bắt buộc: `id, hanzi, pinyin, meaning_vi, level`.
  - Cột tùy chọn: `pos, lesson, topic, example_zh, example_pinyin, example_vi, confusable` (ngăn cách bằng `;`), `audio, note`.
  - Trước khi nhập, app cho xem trước, báo lỗi theo từng dòng và báo ID trùng (trùng ID thì cập nhật từ cũ).
- **Gói JSON + âm thanh**: dùng mẫu `templates/goi-bai-hoc-mau.json`. Chọn **cùng lúc** tệp `.json` và các tệp `.mp3`. App báo rõ tên tệp âm thanh còn thiếu. Gói gồm các phần: `words, grammar, readings, listening, questions`. Có các loại câu hỏi:
  - `choice`, `listen-choice`
  - `fill` (`input`: `hanzi` hoặc `pinyin`, `checkTones`)
  - `order` (`tokens`)
  - `open` (tự đánh giá theo `criteria`)
- **Bài nghe MP3/WAV** kèm lời thoại để nghe chọn đáp án và chép chính tả.

Gói đặt sẵn trên web: chép tệp vào `packs/hskN/pack.json` (âm thanh để trong `packs/hskN/audio/`), rồi thêm một dòng vào `packs/index.json`. Cấu trúc đề và số câu của bài kiểm tra nằm trong `config/hsk-versions.json`. Muốn đổi phiên bản HSK thì sửa tệp này, không phải sửa mã.

## 8. Chức năng

### Đã hoạt động (đã kiểm thử)

- **Hôm nay**:
  - Chọn cấp HSK 1–6. Cấp chưa có dữ liệu ghi “trống” hoặc “Chưa có dữ liệu”.
  - Xem số thẻ đến hạn, số từ mới, số phút đã học, chuỗi ngày học.
  - Nút Tiếp tục bài đang học.
  - Kế hoạch theo ngày thi và số phút mỗi ngày.
  - Nhắc sao lưu; báo khi có bài thi đang làm dở.
- **Từ vựng**:
  - Danh sách theo bài, lọc Yêu thích / Chưa thuộc / Dễ nhầm.
  - Trang chi tiết: ví dụ, ẩn/hiện pinyin và nghĩa, từ dễ nhầm, ghi chú cá nhân, đánh dấu.
- **Flashcard SRS (SM-2)**:
  - Chạm để lật thẻ, chấm 4 mức nhớ, xem trước khoảng ôn.
  - Thẻ đánh “Quên” được đưa lại cuối buổi học.
  - 5 kiểu thẻ: Chữ→Nghĩa, Nghĩa→Chữ, Nghe→Chọn chữ, Gõ pinyin (kiểm tra thanh điệu, nhận cả dấu `nǐ` lẫn số `ni3`), Điền từ vào câu.
- **Ngữ pháp**: 8 mẫu HSK 1, mỗi mẫu có giải thích, ví dụ và phần so sánh dễ nhầm. Bài tập gồm chọn đáp án, điền từ, sắp xếp câu, tìm câu sai.
- **Đọc**:
  - 3 bài đọc; chạm vào từ để tra nghĩa và lưu vào thẻ ôn.
  - Ẩn/hiện pinyin và bản dịch.
  - Có chế độ không giới hạn giờ và chế độ tính giờ.
- **Nghe**:
  - Phát audio trong gói, chọn tốc độ, lặp lại.
  - Lời thoại chỉ hiện khi bạn bấm hoặc khi đã nộp bài.
  - Có nghe chép chính tả; nhập được MP3/WAV của riêng bạn.
- **Viết**:
  - Sắp xếp câu, gõ chữ Hán, gõ pinyin.
  - Câu tự do: xem đáp án mẫu kèm tiêu chí rồi tự đánh giá (app không tự chấm).
- **Thi thử** (bài kiểm tra tự biên soạn — **không phải đề thật**):
  - Đề lắp theo tỷ lệ phần và độ khó, không lặp câu trong một đề.
  - Đồng hồ đếm ngược, chuyển câu, đánh dấu câu cần xem lại, bài làm tự lưu.
  - Chế độ **Luyện tập**: đóng app thì đồng hồ dừng. Chế độ **Mô phỏng**: tính theo giờ kết thúc, hết giờ thì tự nộp; phần nghe giới hạn 2 lượt phát.
  - Chỉ hiện đáp án sau khi nộp. Kết quả có giải thích, thời gian từng phần, lịch sử thi và nút làm lại câu sai.
  - Điểm hiển thị là **điểm tham khảo nội bộ**.
- **Ôn lỗi**:
  - Sổ lỗi sai tự ghi, chia nhóm Từ vựng / Ngữ pháp / Nghe / Đọc / Viết. Một lỗi được coi là đã sửa khi làm đúng 2 lần liên tiếp.
  - Ôn nhanh 10–15 phút, lấy từ đến hạn và lỗi gần đây.
- **Công cụ khác**:
  - Tra từ theo chữ Hán, pinyin có/không dấu, nghĩa tiếng Việt có/không dấu.
  - In danh sách từ hoặc phiếu kiểm tra (để trống cột nghĩa).
  - Thống kê thời gian học thực tế và tỷ lệ đúng theo kỹ năng.
  - Chế độ sáng/tối, cỡ chữ 90–150%.
  - Xem dung lượng đã dùng, xin quyền lưu trữ bền vững.
- **Giao diện**: thanh điều hướng dưới trên điện thoại, thanh bên trái trên máy tính. Tôn trọng vùng tai thỏ và thanh Home của iPhone.

### Chưa có / giới hạn thực tế

- **Dữ liệu**: chỉ có **HSK 1** với 80 từ, 8 mẫu ngữ pháp, 3 bài đọc, 4 hội thoại nghe, 39 câu hỏi. Các cấp HSK 2–6 chưa có dữ liệu.
- **Âm thanh**: gói HSK 1 chưa có audio người đọc thật.
- **Đề mô phỏng chuẩn**: đang khóa, vì cấu trúc đề chưa xác minh từ nguồn chính thức và ngân hàng câu hỏi chưa đủ.
- **Chưa có**:
  - Ghi âm luyện phát âm, chấm phát âm.
  - Viết tay / thứ tự nét.
  - Sổ tay câu giao tiếp, bộ thẻ tự đặt tên.
  - Thông báo nhắc học khi app đóng.
  - Đồng bộ giữa các máy.

## 9. Kết quả kiểm thử đã chạy

**Kiểm thử logic: 16/16 đạt** (`node --test tests/unit.test.mjs`). Nội dung kiểm thử:

- So khớp pinyin: dấu thanh ↔ số thanh, ü/v/u:, sai thanh bị từ chối.
- So khớp chữ Hán khi có dấu câu và khoảng trắng.
- SM-2.
- Đọc CSV: ô có ngoặc kép và xuống dòng, báo lỗi theo dòng.
- Kiểm tra gói mẫu.
- Gộp bản sao lưu không nhân đôi dữ liệu.
- Lắp đề không trùng câu và báo thiếu câu trung thực.

**Kiểm thử trên trình duyệt: 35/35 đạt** (`python tests/e2e.py`). Chạy bằng **Chromium giả lập khung iPhone 13**, kèm một lượt ở khung máy tính. Ảnh chụp nằm trong `tests/screenshots/`. Các tình huống đã kiểm:

- Tải gói, học thẻ, đóng/mở lại vẫn giữ tiến độ.
- Bài thi bị gián đoạn rồi phục hồi; chế độ mô phỏng hết giờ thì tự nộp.
- Nhập CSV/JSON sai định dạng; gói thiếu tệp âm thanh.
- Sao lưu → xóa dữ liệu → phục hồi; từ chối bản sao lưu có phiên bản mới hơn app.
- Mở lại khi mất mạng.
- Cập nhật 1.0.0 → 1.0.1 không mất dữ liệu.
- Máy không có giọng tiếng Trung.
- Không cuộn ngang, kể cả ở cỡ chữ 130%; không có lỗi JavaScript.

**Chưa kiểm thử**:

- **Chưa thử trên iPhone/Safari thật**: kiểm thử giả lập trên Chromium không thay được thiết bị thật. Bạn nên tự làm mục 4 trên iPhone, gồm cả bước bật chế độ máy bay.
- Chưa thử giọng đọc tiếng Trung thật của iOS, tình huống có cuộc gọi đến giữa bài nghe, và việc bàn phím iPhone có che ô nhập hay không. App đã tự cuộn ô nhập lên giữa màn hình, nhưng chưa kiểm trên máy thật.
- Ghi âm và quyền micro: bản này chưa có chức năng ghi âm nên chưa có gì để kiểm.

## 10. Nguồn dữ liệu và phiên bản HSK

- Toàn bộ câu ví dụ, bài đọc, hội thoại và câu hỏi đều **tự biên soạn**, không chép giáo trình hay đề thi. Nội dung do AI soạn và tự rà, **chưa qua giáo viên** — nên nhờ giáo viên đọc lại.
- Từ vựng chọn từ danh sách HSK 2.0 cấp 1. Theo các nguồn đã tra (thứ cấp; **chưa đối chiếu trực tiếp chinesetest.cn**):
  - HSK 3.0 có 9 cấp. Kỳ thi chính thức cấp 1–6 theo HSK 3.0 được công bố bắt đầu từ **13/12/2026**, và cấp 3–6 có thi nói kèm.
  - Các kỳ thi thường kỳ trước đó trong năm 2026 dùng HSK 2.0.
- **Vì vậy:** nếu bạn thi từ tháng 12/2026 trở đi, cần đối chiếu danh sách từ và cấu trúc đề HSK 3.0 chính thức trước khi soạn các gói tiếp theo.

## 11. Lộ trình mở rộng

1. **Ngay sau bản đầu ổn định**:
   - Kiểm thử trên iPhone thật.
   - Đối chiếu đề cương HSK 3.0 cấp 1, mở rộng gói HSK 1 cho đủ danh sách từ chính thức.
   - Thêm audio thu âm có giấy phép rõ ràng.
2. **Gói HSK 2 → 6**: mỗi cấp một gói. Mỗi gói đi theo vòng: soạn CSV từ vựng → ngữ pháp và bài tập → bài đọc/nghe → rà soát → phát hành.
3. **Bổ sung sau**:
   - Ghi âm và nghe lại để so sánh với mẫu (không chấm điểm).
   - Bài phân biệt thanh điệu và các âm dễ nhầm với người Việt (zh/z/j, ü, thanh 2/3).
   - Sổ tay câu giao tiếp, bộ thẻ tự tạo.
   - Đề mô phỏng chuẩn, chỉ mở khi đã có cấu trúc xác minh và đủ ngân hàng câu.
4. **Nâng cao / phụ thuộc tài nguyên ngoài**:
   - Thứ tự nét chữ (cần bộ dữ liệu có giấy phép rõ ràng).
   - Thông báo đẩy nhắc học (iOS 16.4+, cần máy chủ gửi thông báo).
   - Chấm phát âm hoặc AI (tùy chọn, cần Internet, có thể tốn phí).

## 12. Cấu trúc thư mục

```
index.html, manifest.webmanifest, sw.js, offline.html   khung app + offline
css/app.css                 giao diện
js/app.js                   khởi động, điều hướng, Hôm nay, Học tập, Từ vựng, Tra từ, In
js/views2.js                flashcard SRS, bài tập, ngữ pháp, đọc, nghe, viết, sổ lỗi
js/views3.js                thi thử, cá nhân, gói nội dung, sao lưu, quản lý nội dung
js/db.js  srs.js  match.js  csv.js  backup.js  quiz.js  media.js   lớp logic
config/hsk-versions.json    phiên bản HSK, cấu hình bài kiểm tra
packs/index.json, packs/hsk1/pack.json   danh mục gói, gói HSK 1
templates/                  mẫu CSV và JSON để nhập
tools/                      script sinh gói HSK 1 và tài nguyên (Python)
tests/                      kiểm thử + ảnh chụp màn hình
```
