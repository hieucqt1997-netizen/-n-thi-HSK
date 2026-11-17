# Kiểm thử đầu-cuối bằng Playwright (Chromium). Chạy: python tests/e2e.py
# Lưu ý: đây là Chromium giả lập khung iPhone, KHÔNG phải Safari/iOS thật.
import json, os, shutil, subprocess, sys, time, tempfile
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, 'tests', 'screenshots')
os.makedirs(SHOTS, exist_ok=True)
SITE = tempfile.mkdtemp()
shutil.copytree(ROOT, SITE, dirs_exist_ok=True, ignore=shutil.ignore_patterns('tests', 'tools', '.git', '*.zip'))
PORT = 8765
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', SITE], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
URL = f'http://localhost:{PORT}/'
results = []
def ok(name, cond, extra=''):
    results.append((name, bool(cond), extra))
    print(('PASS ' if cond else 'FAIL ') + name + (' — ' + str(extra) if extra else ''))

IDB = """async (store) => new Promise((res, rej) => { const r = indexedDB.open('sotay-hsk'); r.onsuccess = () => { const tx = r.result.transaction(store); const q = tx.objectStore(store).getAll(); q.onsuccess = () => { res(q.result); r.result.close(); }; }; r.onerror = () => rej(r.error); })"""

try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        iphone = p.devices['iPhone 13']
        ctx = b.new_context(**{k: v for k, v in iphone.items() if k != 'default_browser_type'}, accept_downloads=True)
        page = ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.on('dialog', lambda d: d.accept())

        page.goto(URL)
        page.wait_for_selector('#tabs a')
        page.evaluate("navigator.serviceWorker.ready")
        page.wait_for_timeout(800)
        ok('Mở app, có thanh điều hướng dưới 5 mục', page.locator('#tabs a').count() == 5)
        ok('HSK 1 chưa tải: hiển thị trung thực "Chưa có dữ liệu"', page.locator('text=Chưa có dữ liệu').count() > 0)
        page.screenshot(path=f'{SHOTS}/01-lan-dau.png', full_page=True)

        # Tải gói
        page.goto(URL + '#/packs'); page.wait_for_selector('text=Tải về máy')
        page.click('text=Tải về máy')
        page.wait_for_selector('text=Kiểm tra đủ để học offline', timeout=15000)
        words = page.evaluate(IDB, 'words')
        ok('Tải gói HSK 1 vào IndexedDB', len(words) == 80, len(words))
        page.click('text=Kiểm tra đủ để học offline'); page.wait_for_timeout(500)
        ok('Kiểm tra gói đủ offline', page.locator('text=Nội dung gói đầy đủ trên máy').count() == 1 and page.locator('text=Khung ứng dụng đã lưu offline').count() == 1)

        page.goto(URL + '#/today'); page.wait_for_selector('text=thẻ đến hạn')
        ok('Không có thanh cuộn ngang (iPhone)', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        page.screenshot(path=f'{SHOTS}/02-hom-nay.png', full_page=True)

        # Flashcard
        page.click('text=Bắt đầu học hôm nay')
        page.wait_for_selector('.flash')
        page.screenshot(path=f'{SHOTS}/03-the-mat-truoc.png')
        page.click('.flash'); page.wait_for_selector('.grades')
        page.screenshot(path=f'{SHOTS}/04-the-mat-sau.png')
        page.click('.grades >> text=Quên')
        for i in range(4):
            page.click('.flash'); page.click('.grades >> text=Nhớ')
        srs = page.evaluate(IDB, 'srs')
        ok('Chấm mức nhớ lưu lịch ôn', len(srs) == 5 and all(c['due'] for c in srs), len(srs))
        ok('Thẻ "Quên" ghi vào sổ lỗi', any(m['kind'] == 'word' for m in page.evaluate(IDB, 'mistakes')))

        # Chế độ gõ pinyin
        page.goto(URL + '#/review'); page.click('text=Gõ pinyin')
        page.goto(URL + '#/flash?src=more'); page.wait_for_selector('#tp')
        page.fill('#tp', 'zzz'); page.click('text=Kiểm tra'); page.wait_for_selector('.feedback.no')
        ok('Gõ pinyin sai -> báo chưa đúng', True)
        page.screenshot(path=f'{SHOTS}/05-go-pinyin.png')
        page.goto(URL + '#/review'); page.click('text=Chữ → Nghĩa'); page.wait_for_timeout(300)

        # Đóng/mở lại vẫn giữ tiến độ
        page.reload(); page.wait_for_selector('#tabs a')
        ok('Mở lại vẫn giữ tiến độ', len(page.evaluate(IDB, 'srs')) >= 5)

        # Ngữ pháp + bài tập sắp xếp câu
        page.goto(URL + '#/grammar/h1-g-shi'); page.wait_for_selector('text=Làm bài tập')
        page.screenshot(path=f'{SHOTS}/06-ngu-phap.png', full_page=True)
        page.click('text=Làm bài tập')
        page.click('.opt >> nth=0'); page.click('text=Kiểm tra'); page.wait_for_selector('.feedback')
        page.click('text=Câu tiếp')
        page.fill('input[data-input=qfill]', '不是'); page.click('text=Kiểm tra'); page.wait_for_selector('.feedback.ok')
        ok('Điền chữ Hán đúng -> Đúng', True)
        page.click('text=Câu tiếp')
        for t in ['我', '是', '学生']: page.click(f'.row .tok:text-is("{t}")')
        page.click('text=Kiểm tra'); page.wait_for_selector('.feedback.ok')
        ok('Sắp xếp câu đúng -> Đúng', True)
        page.screenshot(path=f'{SHOTS}/07-sap-xep.png')

        # Đọc: tra từ chạm
        page.goto(URL + '#/reading/h1-r-2'); page.wait_for_selector('.tap')
        page.click('.tap >> nth=0'); page.wait_for_selector('#pop .card')
        ok('Chạm tra từ trong bài đọc', page.locator('#pop').inner_text() != '')
        page.screenshot(path=f'{SHOTS}/08-bai-doc.png', full_page=True)

        # Nghe khi không có giọng tiếng Trung (Chromium headless)
        page.goto(URL + '#/listening/h1-l-1'); page.wait_for_selector('text=Phát')
        disabled = page.locator('button[data-act=lplay]').is_disabled()
        msg = page.locator('.card.err').count()
        ok('Thiếu giọng tiếng Trung: nút Phát bị khóa và có thông báo', disabled and msg > 0)
        page.screenshot(path=f'{SHOTS}/09-nghe-khong-giong.png', full_page=True)

        # Thi thử luyện tập: gián đoạn và phục hồi
        page.goto(URL + '#/exam'); page.wait_for_selector('text=Bắt đầu')
        page.screenshot(path=f'{SHOTS}/10-thi-thu.png', full_page=True)
        page.click('button:has-text("Bắt đầu")'); page.wait_for_selector('#etimer')
        page.click('.opt >> nth=1')
        page.click('text=Sau ›'); page.click('.opt >> nth=0')
        page.click('text=⚑ Xem lại')
        t1 = page.locator('#etimer').inner_text()
        page.screenshot(path=f'{SHOTS}/11-dang-thi.png')
        page.reload(); page.wait_for_selector('#tabs a')
        page.goto(URL + '#/today'); page.wait_for_selector('text=Bài thi đang làm dở')
        ok('Trang Hôm nay báo bài thi dở', True)
        page.click('text=Tiếp tục'); page.wait_for_selector('#etimer')
        ex = page.evaluate(IDB, 'exams')[0]
        ok('Bài thi tự lưu đáp án và đánh dấu sau khi tải lại', ex['st'][0].get('ans') == 1 and ex['st'][1].get('ans') == 0 and 1 in ex['marked'], ex['marked'])
        ok('Không hiện đáp án trước khi nộp', page.locator('.feedback').count() == 0 and page.locator('.opt.right').count() == 0)
        page.click('text=Nộp bài'); page.wait_for_selector('text=Điểm tham khảo nội bộ')
        page.screenshot(path=f'{SHOTS}/12-ket-qua.png', full_page=True)
        ok('Có kết quả, đáp án và nút làm lại câu sai', page.locator('text=Làm lại').count() > 0)

        # Mô phỏng thi: hết giờ khi app đóng -> tự nộp
        page.goto(URL + '#/exam'); page.select_option('#emode', 'sim'); page.click('button:has-text("Bắt đầu")'); page.wait_for_selector('#etimer')
        page.goto(URL + '#/today'); page.wait_for_selector('text=Bài thi đang làm dở')
        page.evaluate("""() => new Promise(res => { const r = indexedDB.open('sotay-hsk'); r.onsuccess = () => { const db = r.result; const st = db.transaction('exams','readwrite').objectStore('exams'); st.getAll().onsuccess = (e) => { const x = e.target.result.find(x => !x.submittedAt); x.endsAt = Date.now() - 1000; st.put(x).onsuccess = () => res(); }; }; })""")
        page.click('text=Tiếp tục'); page.wait_for_selector('text=Tự nộp khi hết giờ')
        ok('Mô phỏng thi: quá giờ kết thúc thì tự nộp', True)

        page.goto(URL + '#/mistakes'); page.wait_for_selector('text=Ôn tất cả lỗi')
        page.screenshot(path=f'{SHOTS}/13-so-loi.png', full_page=True)
        ok('Sổ lỗi sai có mục', page.locator('.list li').count() > 0)

        # Nhập CSV sai định dạng
        bad = os.path.join(SITE, 'bad.csv')
        open(bad, 'w', encoding='utf-8').write('id,hanzi,pinyin,meaning_vi,level\nok1,苹果,píngguǒ,quả táo,1\nbad1,,x,y,1\nbad2,abc,a,b,7x\nok1,梨,lí,lê,1\n')
        page.goto(URL + '#/manage'); page.set_input_files('input[data-change=csvPick]', bad); page.wait_for_selector('#csvres .card')
        txt = page.inner_text('#csvres')
        ok('CSV sai: báo lỗi theo dòng', 'Dòng 3' in txt and 'Dòng 4' in txt and 'Dòng 5' in txt, txt[:120])
        page.click('text=Nhập 1 từ hợp lệ'); page.wait_for_timeout(400)
        page.screenshot(path=f'{SHOTS}/14-nhap-csv.png', full_page=True)
        badjson = os.path.join(SITE, 'bad.json'); open(badjson, 'w').write('{"format":"sotay-hsk-pack","id":"p2","level":2,"words":[{"id":"x"}]}')
        page.set_input_files('input[data-change=packPick]', badjson); page.wait_for_selector('#packres .feedback')
        ok('JSON gói sai: báo lỗi trường thiếu', 'thiếu' in page.inner_text('#packres'))
        goodjson = os.path.join(SITE, 'g.json')
        json.dump({"format": "sotay-hsk-pack", "id": "p2", "level": 2, "words": [{"id": "p2-a", "hanzi": "衣服", "pinyin": "yīfu", "vi": "quần áo", "audio": "yifu.mp3"}]}, open(goodjson, 'w'))
        page.set_input_files('input[data-change=packPick]', goodjson); page.click('button[data-act=packGo]'); page.wait_for_selector('#packres .feedback')
        ok('Gói thiếu tệp âm thanh: báo rõ tên tệp thiếu', 'yifu.mp3' in page.inner_text('#packres'))

        # Sao lưu -> xóa -> phục hồi
        n_srs = len(page.evaluate(IDB, 'srs'))
        page.goto(URL + '#/backup'); page.click('text=Tạo tệp sao lưu'); page.wait_for_selector('text=Tải tệp xuống')
        with page.expect_download() as dl: page.click('text=Tải tệp xuống')
        bpath = os.path.join(SITE, 'backup.json'); dl.value.save_as(bpath)
        bk = json.load(open(bpath, encoding='utf-8'))
        ok('Tệp sao lưu có định dạng và phiên bản', bk['format'] == 'sotay-hsk-backup' and bk['schema'] == 1 and len(bk['data']['srs']) == n_srs)
        page.evaluate("""() => new Promise(res => { const r = indexedDB.open('sotay-hsk'); r.onsuccess = () => { const t = r.result.transaction(['srs','mistakes'],'readwrite'); t.objectStore('srs').clear(); t.objectStore('mistakes').clear(); t.oncomplete = () => res(); }; })""")
        ok('Đã xóa tiến độ (giả lập mất dữ liệu)', len(page.evaluate(IDB, 'srs')) == 0)
        wrong = os.path.join(SITE, 'wrong.json'); json.dump({"format": "sotay-hsk-backup", "schema": 9, "data": {}}, open(wrong, 'w'))
        page.set_input_files('input[data-change=pick]', wrong); page.wait_for_selector('#rs .feedback')
        ok('Tệp sao lưu phiên bản mới hơn bị từ chối', 'mới hơn' in page.inner_text('#rs'))
        page.set_input_files('input[data-change=pick]', bpath); page.wait_for_selector('text=Thay thế toàn bộ')
        page.click('text=Thay thế toàn bộ'); page.wait_for_selector('text=Đã thay thế xong')
        ok('Phục hồi lại đủ tiến độ', len(page.evaluate(IDB, 'srs')) == n_srs, n_srs)
        page.set_input_files('input[data-change=pick]', bpath); page.wait_for_selector('text=Gộp với dữ liệu')
        page.click('text=Gộp với dữ liệu'); page.wait_for_selector('text=Đã gộp xong')
        ok('Gộp lần 2 không nhân đôi dữ liệu', len(page.evaluate(IDB, 'srs')) == n_srs)

        # Offline
        ctx.set_offline(True)
        page.goto(URL + '#/today'); page.reload(); page.wait_for_selector('text=thẻ đến hạn', timeout=8000)
        ok('Mở lại khi mất mạng: app chạy từ bộ đệm', page.locator('#net').inner_text() == 'Offline')
        page.goto(URL + '#/word/h1-xiexie'); page.wait_for_selector('.word-head')
        ok('Offline: xem từ vựng', '谢谢' in page.inner_text('.word-head'))
        page.goto(URL + '#/flash?src=more'); page.wait_for_selector('.flash')
        page.click('.flash'); page.click('.grades >> text=Dễ')
        ok('Offline: học thẻ và lưu tiến độ', True)
        page.screenshot(path=f'{SHOTS}/15-offline.png')
        ctx.set_offline(False)

        # Cập nhật app không làm mất dữ liệu
        before = len(page.evaluate(IDB, 'srs'))
        for f in ['sw.js', 'js/app.js']:
            fp = os.path.join(SITE, f); s = open(fp, encoding='utf-8').read().replace("'1.0.0'", "'1.0.1'"); open(fp, 'w', encoding='utf-8').write(s)
        page.goto(URL + '#/me'); page.click('text=Kiểm tra cập nhật')
        page.wait_for_selector('text=Có phiên bản mới', timeout=10000)
        page.screenshot(path=f'{SHOTS}/16-co-ban-moi.png')
        page.click('#upd'); page.wait_for_timeout(2500); page.wait_for_selector('#tabs a')
        ver = page.inner_text('#ver-side')
        ok('Cập nhật lên 1.0.1 sau khi bấm Cập nhật', '1.0.1' in ver, ver)
        ok('Cập nhật không mất tiến độ', len(page.evaluate(IDB, 'srs')) == before and len(page.evaluate(IDB, 'words')) >= 80)

        # Máy tính
        dctx = b.new_context(viewport={'width': 1280, 'height': 800})
        dp = dctx.new_page(); dp.goto(URL); dp.wait_for_selector('#side .nav a')
        ok('Máy tính: thanh điều hướng bên trái hiển thị', dp.locator('#side').is_visible() and not dp.locator('#tabs').is_visible())
        dp.screenshot(path=f'{SHOTS}/17-may-tinh.png')
        # Chế độ tối + cỡ chữ lớn trên iPhone
        page.goto(URL + '#/me'); page.select_option('select[data-k=theme]', 'dark'); page.select_option('select[data-k=fs]', '1.3')
        page.goto(URL + '#/word/h1-pengyou'); page.wait_for_selector('.word-head')
        ok('Cỡ chữ 130% vẫn không cuộn ngang', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        page.screenshot(path=f'{SHOTS}/18-toi-chu-lon.png', full_page=True)

        real_errors = [e for e in errors if 'net::ERR_INTERNET_DISCONNECTED' not in e and 'Failed to fetch' not in e and 'favicon' not in e]
        ok('Không có lỗi JavaScript', not real_errors, real_errors[:5])
        b.close()
finally:
    srv.terminate()
print(f"\n{sum(1 for r in results if r[1])}/{len(results)} PASS")
json.dump([{'name': n, 'pass': p_, 'extra': str(e)} for n, p_, e in results], open(os.path.join(ROOT, 'tests', 'e2e-ketqua.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
