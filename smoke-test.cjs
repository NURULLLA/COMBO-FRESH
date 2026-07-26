/**
 * Cargo Trim — smoke test for the loadsheet / allowed-weight chain.
 *
 *   npm install jsdom
 *   node smoke-test.cjs [path/to/index.html]
 *
 * Drives the app headlessly and asserts the numbers the loadmaster reads.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const FILE = process.argv[2] || path.join(__dirname, 'index.html');
const html = fs.readFileSync(FILE, 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map(m => m[1]).sort((a, b) => b.length - a.length)[0];

const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://example.com/' });
const w = dom.window;
w.HTMLCanvasElement.prototype.getContext = () => ({});                 // no canvas in jsdom
w.Chart = function () { this.data = { datasets: Array.from({ length: 6 }, () => ({ data: [] })) }; this.update = () => {}; };
Object.defineProperty(w.navigator, 'serviceWorker', { value: undefined, configurable: true });

let failed = 0;
const $   = id => w.document.getElementById(id);
const txt = id => { const e = $(id); return e ? e.textContent.trim() : '<missing ' + id + '>'; };
const check = (label, got, want) => {
    const ok = String(got) === String(want);
    if (!ok) failed++;
    console.log((ok ? '  PASS  ' : '  FAIL  ') + label.padEnd(30) + String(got).padStart(10) + '   expected ' + want);
};

try { w.eval(script); } catch (e) { console.error('script threw:', e.message); process.exit(1); }

// ---------- scenario: AC57 / crew 2+1 / PMC ----------
const DOW = 53442, FOB = 26664, TRIP = 14218, NET = 21500;
const TOF = FOB - 380;                    // 26284
const MZFW = 90718, MLW = 95254, MTOW = 113398;
const OW  = DOW + TOF;                    // 79726
const ZFA = MZFW + TOF;                   // 117002
const LDA = MLW + TRIP;                   // 109472
const ATL = Math.min(MTOW, ZFA, LDA) - OW;
const LOAD = 15000 + 8075;                // 5x3000 main + 4000/4075 bulk

$('fob-input').value = FOB;
$('trip-input').value = TRIP;
$('applyFuelBtn').dispatchEvent(new w.Event('click', { bubbles: true }));

w.document.querySelectorAll('#mainDeckGrid input').forEach((el, i) => {
    if (i < 5) { el.value = '3000'; el.dispatchEvent(new w.Event('input', { bubbles: true })); }
});

// Quick-Add and Net Weight use inline oninput="" attributes, which jsdom does not
// compile in outside-only mode — call the same handlers the browser calls.
const q = w.document.querySelectorAll('#bulkList input');
q[0].value = '4000'; w.updateBulkItem(q[0]);
q[1].value = '4075'; w.updateBulkItem(q[1]);

// Bulk is only folded into Total Load once allocated to compartments.
$('optimizeBtn').dispatchEvent(new w.Event('click', { bubbles: true }));

setTimeout(() => {
    console.log('\nDOW ' + txt('disp-dow') + ' / idx ' + txt('disp-dowIdx') +
                '   FOB ' + FOB + ' -> TO fuel ' + TOF + '   trip ' + TRIP + '\n');

    check('Total Load',            txt('val-load-wt'),     LOAD.toFixed(1));
    check('Operating Weight',      txt('val-ow'),          OW);
    check('Zero Fuel Allowed WGT', txt('val-zf-allowed'),  ZFA);
    check('Landing Allowed WGT',   txt('val-ldg-allowed'), LDA);
    check('ATL binding limit',     txt('val-atl-limit'),   'by LDG');
    check('Allowed Traffic Load',  txt('val-atl'),         ATL);
    check('Underload b4 LMC',      txt('val-underload'),   ATL - LOAD);

    $('net-weight-input').value = NET; w.updateNetWeight(String(NET));
    check('Tare Weight Outcome',   txt('val-two'),         LOAD - NET);

    check('Max Payload removed',   $('val-max-payload') === null, 'true');

    const saved = JSON.parse(w.localStorage.getItem('comboFreshState'));
    check('netWeight persisted',   saved.netWeight,        NET);
    check('fob persisted',         saved.fob,              FOB);

    console.log('\n' + (failed ? failed + ' CHECK(S) FAILED' : 'ALL CHECKS PASSED'));
    process.exit(failed ? 1 : 0);
}, 3000);
