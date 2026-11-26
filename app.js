const SKEY = "studio_adventure_v2";
const DEFAULT_STATE = {
  player: {
    name: "Siswa DKV",
    school: "10 DKV 1",
    avatar: "🎬",
    role: "Produser",
    xp: 0,
    level: 1,
  },
  missions: { 1: false, 2: false, 3: false },
  quizScore: 0,
  quizCompleted: false,
  projectSaved: false,
  reflectionSaved: false,
  project: {},
  reflection: {},
  minigames: { 1: false, 2: false, 3: false },
  visited: {},
  badges: {},
  quizTries: 0,
  high1: 0,
  settings: { big: 0, calm: 0, bgm: 0 },
};

const clone = (o) => JSON.parse(JSON.stringify(o));

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(SKEY));
    if (s && typeof s === "object") {
      const d = clone(DEFAULT_STATE);
      return Object.assign(d, s, {
        player: Object.assign(d.player, s.player || {}),
        missions: Object.assign(d.missions, s.missions || {}),
        minigames: Object.assign(d.minigames, s.minigames || {}),
      });
    }
  } catch (e) {}
  return clone(DEFAULT_STATE);
}

let state = loadState();

function saveState() {
  try {
    localStorage.setItem(SKEY, JSON.stringify(state));
  } catch (e) {}
  updateUI();
}

const $ = (id) => document.getElementById(id);

function askReset() {
  $("reset-area").innerHTML =
    '<span class="text-slate-300">Hapus semua progres? </span><button onclick="doReset()" class="text-coralOrange font-bold underline mr-2">Ya, hapus</button><button onclick="cancelReset()" class="text-cyanAccent underline">Batal</button>';
}

function cancelReset() {
  $("reset-area").innerHTML =
    '<button onclick="askReset()" class="text-coralOrange hover:underline text-sm">↺ Reset Data</button>';
}

function doReset() {
  try {
    localStorage.removeItem(SKEY);
  } catch (e) {}
  state = clone(DEFAULT_STATE);
  initPages();
  saveState();
  cancelReset();
  showToast("Data progres direset.", "info");
}

let audioCtx = null,
  isMuted = false,
  globalVolume = 0.5;

function playTone(f, type, d, v = 1) {
  if (isMuted) return;
  try {
    if (!audioCtx)
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const o = audioCtx.createOscillator(),
      g = audioCtx.createGain(),
      t = audioCtx.currentTime;
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(Math.max(globalVolume * 0.2 * v, 0.0002), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(t + d);
  } catch (e) {}
}

function playSound(e) {
  if (e === "correct") {
    playTone(523, "sine", 0.15);
    setTimeout(() => playTone(659, "sine", 0.25), 120);
  } else if (e === "wrong") playTone(200, "sawtooth", 0.2);
  else if (e === "xp") playTone(880, "triangle", 0.1);
  else if (e === "levelup") {
    playTone(440, "sine", 0.1);
    setTimeout(() => playTone(554, "sine", 0.1), 100);
    setTimeout(() => playTone(659, "sine", 0.3), 200);
  }
}

function toggleAudio() {
  isMuted = !isMuted;
  $("audio-icon").textContent = isMuted ? "🔇" : "🔊";
  showToast(isMuted ? "Suara dimatikan" : "Suara aktif", "info");
}

function showToast(msg, type = "info") {
  const c = $("toast-container"),
    t = document.createElement("div");
  const col =
    {
      info: "border-cyanAccent text-warmWhite",
      success: "border-freshTeal text-freshTeal",
      error: "border-coralOrange text-coralOrange",
      gold: "border-goldenYellow text-goldenYellow",
    }[type] || "";
  t.className =
    "p-3 rounded-xl border-2 bg-slate-900 " +
    col +
    " shadow-2xl text-sm font-bold pointer-events-auto";
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function addXP(n) {
  state.player.xp += n;
  playSound("xp");
  showToast("+" + n + " XP!", "gold");
  const lv = Math.floor(state.player.xp / 100) + 1;
  if (lv > state.player.level) {
    state.player.level = lv;
    playSound("levelup");
    showToast("🎉 NAIK LEVEL! Level " + lv, "gold");
    confetti();
  }
  saveState();
}

const TABS = [
  ["beranda", "🏠", "Beranda"],
  ["materi", "📖", "SOP Produksi"],
  ["misi", "🎯", "Studi Kasus"],
  ["minigames", "🎮", "3 Mini Game"],
  ["kuis", "📝", "Kuis Evaluasi"],
  ["proyek", "🧩", "Tugas Proyek"],
  ["refleksi", "🧠", "Jurnal Refleksi"],
  ["pencapaian", "🏆", "Galeri Lencana"],
  ["glosarium", "📚", "Glosarium & Pustaka"],
  ["tentang", "ℹ️", "Tentang & Rubrik"],
  ["sertifikat", "📜", "Sertifikat"],
];
let currentTab = "beranda";

function switchTab(id) {
  currentTab = id;
  document
    .querySelectorAll(".tab-content")
    .forEach((e) => e.classList.add("hidden"));
  $("content-" + id).classList.remove("hidden");
  $("nav-tabs").innerHTML = TABS.map(
    (t) =>
      `<button onclick="switchTab('${t[0]}')" class="px-3 py-2 rounded-lg transition ${t[0] === id ? "bg-cyanAccent text-midnight font-bold" : "hover:bg-slate-800 text-slate-300"}">${t[1]} ${t[2]}</button>`,
  ).join("");
  if (id === "minigames") switchMiniGame(curGame);
  else stopGames();
  if (id === "sertifikat") {
    updateUI();
    if (pctDone(state) >= 100) playSound("levelup");
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-back]").forEach((el) => {
  const [t, c] = el.dataset.back.split("|");
  el.className =
    "flex flex-wrap items-center justify-between gap-2 bg-slate-900 border border-slate-800 p-4 rounded-xl";
  el.innerHTML = `<button onclick="switchTab('beranda')" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyanAccent rounded-lg text-sm font-bold">← Kembali</button><h2 class="text-lg font-bold ${c}">${t}</h2>`;
});

function updatePlayerProfile() {
  state.player.name = $("input-player-name").value.trim() || "Siswa DKV";
  state.player.school =
    $("input-player-school").value.trim() || "10 DKV 1";
  try {
    localStorage.setItem(SKEY, JSON.stringify(state));
  } catch (e) {}
  updateUI(true);
}

const ORIGINAL_GLOSARIUM = [
  { term: "Brief Klien", def: "Ringkasan kebutuhan klien: tujuan, audiens, pesan, batasan waktu dan biaya." },
  { term: "Storyboard", def: "Sketsa berurutan yang menggambarkan setiap shot sebelum syuting." },
  { term: "Contingency Plan", def: "Rencana cadangan bila terjadi kendala (cuaca, alat rusak, talent berhalangan)." },
  { term: "Call Sheet", def: "Dokumen jadwal harian produksi berisi lokasi, daftar kru, talenta, dan urutan adegan." },
  { term: "Shot", def: "Satu pengambilan gambar yang tidak terputus." },
  { term: "Framing", def: "Cara menata objek di dalam bingkai gambar." },
  { term: "Lighting 3-point", def: "Tata cahaya dengan key light, fill light, dan back light." },
  { term: "Footage RAW", def: "Rekaman mentah dari kamera sebelum diedit." },
  { term: "Media Offloading", def: "Memindahkan dan mem-backup rekaman dari kartu memori ke penyimpanan lain." },
  { term: "Picture Lock", def: "Tahap ketika susunan gambar dianggap final dan tidak diubah lagi." },
  { term: "Color Grading", def: "Penyesuaian tone warna dan kontras agar visual konsisten sesuai suasana cerita." },
  { term: "Audio Mixing", def: "Menyeimbangkan dialog, efek suara, dan musik." },
  { term: "Royalty-Free", def: "Musik atau aset yang dipakai dengan lisensi tanpa royalti berulang; tetap periksa syarat lisensinya." }
];

function getGlossaryItems() {
  const candidates = ["GLOSARIUM", "GLOS", "GLOSSARY", "GLOSARIUM_DATA", "ISTILAH", "TERMS"];
  for (const name of candidates) {
    try {
      const val = eval(name);
      if (Array.isArray(val) && val.length > 0) {
        return val.map((item) =>
          Array.isArray(item)
            ? { term: item[0], def: item[1] }
            : {
                term: item.term || item.istilah || item.nama || item.title || "",
                def: item.def || item.definisi || item.arti || item.desc || "",
              },
        );
      }
    } catch (e) {}
  }
  return ORIGINAL_GLOSARIUM;
}

function renderGlosariumList(filterQuery = "") {
  const sec =
    $("content-glosarium") ||
    Array.from(document.querySelectorAll(".tab-content, section")).find((el) =>
      el.textContent.includes("Glosarium & Daftar Pustaka"),
    );
  if (!sec) return;

  const searchInput =
    sec.querySelector('input[placeholder*="storyboard" i]') ||
    sec.querySelector('input[type="text"], input[type="search"]');

  if (searchInput && !searchInput.dataset.glosBound) {
    searchInput.dataset.glosBound = "1";
    searchInput.addEventListener("input", (e) => {
      renderGlosariumList(e.target.value);
    });
  }

  const query = (filterQuery || (searchInput ? searchInput.value : "") || "")
    .trim()
    .toLowerCase();

  const searchCard = searchInput
    ? searchInput.closest(".bg-slate-900, .rounded-2xl, div")
    : sec;

  let listWrap = $("custom-glosarium-list");
  if (!listWrap) {
    listWrap = document.createElement("div");
    listWrap.id = "custom-glosarium-list";
    if (searchCard) {
      searchCard.appendChild(listWrap);
    } else {
      sec.appendChild(listWrap);
    }
  }

  listWrap.className = "mt-4 space-y-3.5";

  const items = getGlossaryItems().filter(
    (it) =>
      !query ||
      it.term.toLowerCase().includes(query) ||
      it.def.toLowerCase().includes(query),
  );

  if (items.length === 0) {
    listWrap.innerHTML = `
      <p class="text-xs text-slate-400 py-2">
        Istilah "<b class="text-warmWhite">${query}</b>" tidak ditemukan.
      </p>
    `;
    return;
  }

  listWrap.innerHTML = items
    .map(
      (it) => `
      <div class="border-l-2 border-goldenYellow pl-3 py-0.5">
        <div class="font-bold text-sm text-goldenYellow">${it.term}</div>
        <div class="text-xs md:text-sm text-warmWhite mt-0.5 leading-relaxed">${it.def}</div>
      </div>
    `,
    )
    .join("");
}

if (typeof switchTab === "function") {
  const _prevSwitchTabGlos = switchTab;
  switchTab = function (t) {
    _prevSwitchTabGlos(t);
    if (/glos|pustaka/i.test(String(t))) {
      renderGlosariumList();
    }
  };
}

renderGlosariumList();

const MATERI = [
  [
    "1",
    "Tahap Praproduksi",
    "Perencanaan & Riset Konsep",
    "cyanAccent",
    [
      "Client Briefing: memahami target audiens & pesan utama produk atau klien.",
      "Scriptwriting & Storyboard: visualisasi adegan dan urutan shot.",
      "Rencana Anggaran & Jadwal: budget, izin lokasi, call sheet.",
      "Casting & Equipment Check: pembagian peran & penyiapan alat.",
    ],
  ],
  [
    "2",
    "Tahap Produksi",
    "Eksekusi Lapangan & Shooting",
    "coralOrange",
    [
      "Cinematography: sudut kamera, framing, lighting 3-point.",
      "Field Audio: Clip-on Lavalier & Mic Boom agar suara jernih.",
      "Directing: mengarahkan talent sesuai storyboard.",
      "Media Offloading: transfer & backup footage RAW ke storage terpisah.",
    ],
  ],
  [
    "3",
    "Tahap Pascaproduksi",
    "Penyempurnaan & Finalisasi",
    "freshTeal",
    [
      "Rough Cut & Offline Editing: memotong klip sesuai storyboard.",
      "Color Grading: menyesuaikan tone warna agar konsisten dengan konsep dan mood video.",
      "Audio Mixing & BGM: SFX, VO, dan musik Royalty-Free berlisensi.",
      "Exporting: render MP4 4K/FHD sesuai platform rilis.",
    ],
  ],
];

const MEX = [
  [
    "Storyboard 6 panel iklan produk 30 detik: (1) close-up produk, (2) produk digunakan, (3) ekspresi pengguna, (4) manfaat produk, (5) suasana penggunaan, (6) logo dan slogan.",
    "Praproduksi menentukan arah. Tanpa brief, naskah, jadwal, dan anggaran yang jelas, tahap berikutnya boros dan berisiko diulang.",
  ],
  [
    "Call sheet hari syuting: 08.00 kru tiba, 09.00 setup, 10.00 adegan 1–3, 12.00 istirahat, 13.00 adegan 4–6, 16.00 backup footage ke dua tempat.",
    "Produksi mengeksekusi rencana. Pastikan audio jernih, arahkan talent sesuai storyboard, dan langsung backup footage.",
  ],
  [
    "Urutan kerja: rough cut, picture lock, color grading, audio mixing, export MP4, lalu revisi sesuai kesepakatan (maksimal 2 putaran).",
    "Pascaproduksi mengubah bahan mentah menjadi video final. Kontrol kualitas dan batas revisi dijaga lewat kontrak.",
  ],
];

$("materi-grid").innerHTML = MATERI.map(
  (m, i) =>
    `<div class="bg-slate-900/90 border border-${m[3]}/30 rounded-xl p-5 space-y-4 hover:border-${m[3]} transition"><div class="flex items-center gap-3 border-b border-slate-800 pb-3"><div class="w-10 h-10 rounded-lg bg-${m[3]}/20 border border-${m[3]} flex items-center justify-center text-${m[3]} font-bold">${m[0]}</div><div><h3 class="font-bold">${m[1]}</h3><p class="text-sm text-${m[3]}">${m[2]}</p></div></div><ul class="text-sm text-slate-300 space-y-2 list-disc list-inside">${m[4]
      .map((x) => {
        const [a, b] = x.split(": ");
        return `<li><strong>${a}:</strong> ${b}</li>`;
      })
      .join(
        "",
      )}</ul><div class="bg-midnight border border-${m[3]}/40 rounded-lg p-3 text-sm"><b class="text-goldenYellow">Contoh Penerapan:</b> ${MEX[i][0]}</div><div class="bg-iceBlue/10 border border-slate-700 rounded-lg p-3 text-sm"><b class="text-freshTeal">Ringkasan:</b> ${MEX[i][1]}</div></div>`,
).join("");

const MISI = [
  {
    t: "Misi 1: Praproduksi",
    c: "cyanAccent",
    b: "text-midnight",
    h: "Sengketa Hak Cipta Penggunaan Backsound Kedai Kopi Senja",
    s: "Klien menginginkan lagu viral untuk iklan Kopi Senja, namun proyek tidak punya anggaran lisensi komersial major label. Apa tindakan profesional Anda?",
    o: [
      "Tetap memakai lagu viral tanpa izin demi popularitas video.",
      "Edukasi klien soal hak cipta & sediakan alternatif musik Royalty-Free komersial bernuansa sejenis.",
      "Batalkan proyek karena berbeda pandangan dengan klien.",
      "Tetap memakai lagu viral sesuai keinginan klien dengan menyerahkan sepenuhnya risiko klaim hak cipta kepada pihak klien saat tayang.",

    ],
    a: 1,
    ex: [
      "Berisiko copyright strike dan tuntutan hukum bagi klien dan tim.",
      "Tepat: kamu melindungi klien dari risiko hukum sambil tetap memenuhi nuansa yang diinginkan.",
      "Terlalu ekstrem: masalah ini punya solusi dengan komunikasi dan alternatif.",
      "Tidak profesional karena kreator tetap ikut bertanggung jawab atas distribusi karya yang melanggar hak cipta.",
    ],
  },
  {
    t: "Misi 2: Produksi",
    c: "coralOrange",
    b: "text-warmWhite",
    h: "Gangguan Cuaca Hujan Saat Shooting di Outdoor",
    s: "Saat shooting outdoor di kedai Kopi Senja, hujan deras turun. Jadwal terancam molor dan alat elektronik berisiko rusak. Langkah apa yang paling aman?",
    o: [
      "Amankan kamera & lighting, lalu alihkan adegan ke interior sesuai contingency plan.",
      "Tetap menembus hujan demi deadline tanpa melindungi alat.",
      "Hentikan semua kegiatan hari ini tanpa memberi tahu klien dan tim.",
      "Membungkus kamera dan lampu dengan plastik seadanya lalu tetap melanjutkan pengambilan gambar.",
    ],
    a: 0,
    ex: [
      "Tepat: alat aman, jadwal tetap berjalan, dan rencana cadangan terpakai.",
      "Membahayakan alat, kru, dan kualitas gambar.",
      "Jadwal terbuang dan klien tidak mendapat kabar; komunikasi penting.",
      "Plastik seadanya berisiko terhadap korsleting dan suara hujan merusak kualitas rekaman audio lapangan.",
    ],
  },
  {
    t: "Misi 3: Pascaproduksi",
    c: "freshTeal",
    b: "text-midnight",
    h: "Permintaan Revisi Melebihi Kuota Kontrak",
    s: "Klien meminta mengubah total konsep editing yang bertentangan dengan storyboard awal dan melampaui batas 2x revisi gratis. Bagaimana solusi profesional Anda?",
    o: [
      "Tunjukkan kesepakatan kontrak dengan santun dan tawarkan adendum biaya revisi mayor.",
      "Turuti semua revisi tanpa biaya meskipun rugi waktu dan tenaga.",
      "Tolak keras tanpa penjelasan.",
      "Menyerahkan seluruh file proyek mentah secara gratis agar klien dapat mengedit ulang konsepnya sendiri.",
    ],
    a: 0,
    ex: [
      "Tepat: kontrak dihormati, hubungan baik terjaga, dan ada solusi jelas.",
      "Merugikan tim dan menjadi preseden revisi tanpa batas.",
      "Tidak profesional; klien butuh alasan dan alternatif.",
      "File mentah merupakan aset terpisah yang memiliki nilai hak cipta tersendiri"
    ],
  },
];

$("misi-list").innerHTML = MISI.map(
  (m, i) =>
    `<div class="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4"><div class="flex justify-between items-start gap-2 border-b border-slate-800 pb-3"><div><span class="px-2 py-0.5 bg-${m.c}/20 text-${m.c} text-sm font-semibold rounded">${m.t}</span><h3 class="text-lg font-bold mt-1">${m.h}</h3></div><span id="misi${i + 1}-status" class="px-3 py-1 bg-slate-800 text-slate-300 text-sm rounded-full whitespace-nowrap">Belum Selesai</span></div><p class="text-sm text-slate-300">${m.s}</p><div class="space-y-2 text-sm">${m.o.map((o, j) => `<label class="flex items-start space-x-3 p-3 rounded-lg bg-slate-800/60 border border-slate-700 hover:border-${m.c} cursor-pointer"><input type="radio" name="misi${i + 1}-opt" value="${j}" class="accent-${m.c} mt-0.5"><span>${"ABCD"[j]}. ${o}</span></label>`).join("")}</div><div class="flex flex-wrap justify-between items-center gap-2 pt-2"><div id="misi${i + 1}-feedback" class="text-sm font-semibold flex-1 min-w-[200px]"></div><button onclick="submitMission(${i + 1})" class="px-5 py-2 rounded-lg bg-${m.c} ${m.b} font-bold text-sm hover:brightness-110">Kirim Keputusan Misi ${i + 1}</button></div></div>`,
).join("");

function markMission(n) {
  const s = $("misi" + n + "-status");
  if (state.missions[n]) {
    s.className =
      "px-3 py-1 bg-freshTeal/20 text-freshTeal text-sm font-bold rounded-full whitespace-nowrap";
    s.textContent = "Selesai ✔";
  }
}

function submitMission(n) {
  const sel = document.querySelector(`input[name="misi${n}-opt"]:checked`),
    fb = $("misi" + n + "-feedback");
  if (!sel) {
    fb.innerHTML =
      '<span class="text-coralOrange">Pilih salah satu opsi dulu.</span>';
    return;
  }
  const m = MISI[n - 1],
    v = +sel.value,
    ok = v === m.a;
  if (ok) {
    playSound("correct");
    fb.innerHTML =
      '<span class="text-freshTeal">✔ Keputusan tepat! ' +
      m.ex[v] +
      "</span>";
    if (!state.missions[n]) {
      state.missions[n] = true;
      addXP(50);
    }
  } else {
    playSound("wrong");
    fb.innerHTML =
      '<span class="text-coralOrange">✖ Kurang tepat. ' +
      m.ex[v] +
      " Coba lagi!</span>";
  }
  saveState();
}

let curGame = 1;
const GTAB = [
  [1, "🧺 Game 1: Asset Catcher", "bg-coralOrange"],
  [2, "🎚 Game 2: Timeline & Equipment", "bg-cyanAccent"],
  [3, "🏢 Game 3: Virtual Studio", "bg-goldenYellow"],
];

function stopGames() {
  cancelAnimationFrame(catcherAnimId);
  cancelAnimationFrame(studioAnimId);
  holdL = holdR = false;
  studioDir = null;
}

function switchMiniGame(n) {
  curGame = n;
  stopGames();
  [1, 2, 3].forEach((i) =>
    $("mg-container-" + i).classList.toggle("hidden", i !== n),
  );
  $("mg-tabs").innerHTML = GTAB.map(
    (g) =>
      `<button onclick="switchMiniGame(${g[0]})" class="px-4 py-2 rounded-lg text-sm font-bold ${g[0] === n ? g[2] + " text-midnight" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}">${g[1]}${state.minigames[g[0]] ? " ✔" : ""}</button>`,
  ).join("");
  if (n === 1) initCatcherGame();
  if (n === 2) initTimelineGame();
  if (n === 3) initStudioGame();
}

let cc,
  cx,
  catcherAnimId,
  holdL = false,
  holdR = false,
  keyL = false,
  keyR = false,
  catcherStarted = false,
  catcherPaused = false,
  catcherGameOver = false,
  catcherScore = 0,
  catcherLives = 3,
  catcherTimeLeft = 15,
  catcherLastFrameTime = 0,
  catcherTick = 0,
  spawnCooldown = 0,
  fallingItems = [],
  catcherFloaters = [],
  pointerTargetX = null,
  bin = {
    x: 400,
    y: 378,
    w: 112,
    h: 26,
    vx: 0,
    maxSpeed: 9.5,
    tilt: 0,
    pulse: 0,
    pulseColor: "#38BDF8",
  };

const CATCHER_DURATION = 15;
const CATCHER_TARGET_SCORE = 50;

const ASSET_TYPES = [
  { id: "cam", label: "KAMERA", valid: true, color: "#38BDF8" },
  { id: "script", label: "NASKAH", valid: true, color: "#34D399" },
  { id: "mic", label: "AUDIO", valid: true, color: "#60A5FA" },
  { id: "edit", label: "EDITING", valid: true, color: "#2DD4BF" },
  { id: "corrupt", label: "CORRUPT", valid: false, color: "#FB7185" },
  { id: "noise", label: "NOISE", valid: false, color: "#F87171" },
];

function catcherRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getCatcherBest() {
  return Math.max(state.catcherHigh || 0, state.bestCatcher || 0);
}

function setCatcherBest(val) {
  state.catcherHigh = val;
  state.bestCatcher = val;
}

function updateCatcherHUD() {
  const sec = Math.max(0, Math.ceil(catcherTimeLeft));
  const timeEl = $("catcher-time");
  if (timeEl) {
    timeEl.textContent = sec + "d";
    timeEl.className =
      sec <= 5 && catcherStarted && !catcherGameOver
        ? "text-coralOrange font-extrabold"
        : "text-goldenYellow font-bold";
  }

  const scoreEl = $("catcher-score");
  if (scoreEl) {
    scoreEl.textContent = catcherScore;
    scoreEl.className =
      catcherScore >= CATCHER_TARGET_SCORE
        ? "text-freshTeal font-extrabold"
        : "text-cyanAccent font-bold";
  }

  if ($("catcher-best")) $("catcher-best").textContent = getCatcherBest();
  if ($("catcher-plays"))
    $("catcher-plays").textContent = (state.catcherPlays || 0) + "x";

  const badgeEl = $("catcher-status-badge");
  if (badgeEl) {
    if (state.minigames && state.minigames[1]) {
      badgeEl.textContent = `✔ Selesai (Rekor ${getCatcherBest()})`;
      badgeEl.className =
        "px-2 py-0.5 rounded-md bg-freshTeal/15 border border-freshTeal/50 text-[11px] font-bold text-freshTeal";
    } else {
      badgeEl.textContent = "Target: 50 Poin";
      badgeEl.className =
        "px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-300";
    }
  }

  const dots = Array.from({ length: 3 }, (_, i) =>
    i < catcherLives ? "●" : "○",
  ).join(" ");
  if ($("catcher-lives")) {
    $("catcher-lives").innerHTML =
      `<span class="${catcherLives === 1 ? "text-coralOrange" : "text-freshTeal"} tracking-wider">${dots}</span>`;
  }
}

function updateCatcherButtons() {
  const mainBtn = $("btn-catcher-main");
  const pauseBtn = $("btn-catcher-pause");
  if (!mainBtn || !pauseBtn) return;

  if (!catcherStarted) {
    mainBtn.textContent = "▶ Start";
    mainBtn.className =
      "px-4 py-1.5 bg-freshTeal text-midnight text-xs font-extrabold rounded-lg hover:brightness-110 transition cursor-pointer";
    pauseBtn.disabled = true;
    pauseBtn.textContent = "⏸ Jeda";
  } else {
    mainBtn.textContent = "↻ Ulangi";
    mainBtn.className =
      "px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition cursor-pointer";
    pauseBtn.disabled = catcherGameOver;
    pauseBtn.textContent = catcherPaused ? "▶ Lanjut" : "⏸ Jeda";
  }
}

function bindCatcherControls() {
  if (!cc || cc._catcherBound) return;
  cc._catcherBound = true;

  const toCanvasX = (clientX) => {
    const r = cc.getBoundingClientRect();
    return ((clientX - r.left) * 800) / r.width;
  };

  cc.addEventListener("mousemove", (e) => {
    if (!catcherStarted || catcherPaused || catcherGameOver) return;
    pointerTargetX = Math.max(
      bin.w / 2 + 16,
      Math.min(800 - bin.w / 2 - 16, toCanvasX(e.clientX)),
    );
  });

  cc.addEventListener("mouseleave", () => {
    pointerTargetX = null;
  });

  cc.addEventListener("click", (e) => {
    if (!catcherStarted || catcherGameOver) {
      startCatcherGame();
      return;
    }
    if (catcherPaused) {
      toggleCatcherPause();
      return;
    }
    pointerTargetX = Math.max(
      bin.w / 2 + 16,
      Math.min(800 - bin.w / 2 - 16, toCanvasX(e.clientX)),
    );
  });

  cc.addEventListener(
    "touchstart",
    (e) => {
      if (!catcherStarted || catcherGameOver) {
        startCatcherGame();
        return;
      }
      if (e.touches.length > 0) {
        pointerTargetX = Math.max(
          bin.w / 2 + 16,
          Math.min(800 - bin.w / 2 - 16, toCanvasX(e.touches[0].clientX)),
        );
      }
    },
    { passive: true },
  );

  cc.addEventListener(
    "touchmove",
    (e) => {
      if (!catcherStarted || catcherPaused || catcherGameOver) return;
      if (e.touches.length > 0) {
        pointerTargetX = Math.max(
          bin.w / 2 + 16,
          Math.min(800 - bin.w / 2 - 16, toCanvasX(e.touches[0].clientX)),
        );
      }
    },
    { passive: true },
  );
}

function initCatcherGame() {
  cancelAnimationFrame(catcherAnimId);
  cc = $("catcherCanvas");
  if (!cc) return;
  cx = cc.getContext("2d");
  bindCatcherControls();

  catcherStarted = false;
  catcherPaused = false;
  catcherGameOver = false;
  catcherScore = 0;
  catcherLives = 3;
  catcherTimeLeft = CATCHER_DURATION;
  catcherTick = 0;
  spawnCooldown = 12;
  fallingItems = [];
  catcherFloaters = [];
  pointerTargetX = null;

  bin.x = 400;
  bin.vx = 0;
  bin.tilt = 0;
  bin.pulse = 0;

  cc.classList.remove("cursor-ew-resize");
  cc.classList.add("cursor-pointer");

  updateCatcherHUD();
  updateCatcherButtons();

  drawCatcherBackground();
  drawAssetBin();
  drawCatcherOverlay(
    "Media Asset Catcher",
    `Kumpulkan min. ${CATCHER_TARGET_SCORE} poin dalam ${CATCHER_DURATION} detik`,
    "▶ Start Game",
  );
}

function startCatcherGame() {
  cancelAnimationFrame(catcherAnimId);
  catcherStarted = true;
  catcherPaused = false;
  catcherGameOver = false;
  catcherScore = 0;
  catcherLives = 3;
  catcherTimeLeft = CATCHER_DURATION;
  catcherTick = 0;
  spawnCooldown = 10;
  fallingItems = [];
  catcherFloaters = [];
  pointerTargetX = null;

  bin.x = 400;
  bin.vx = 0;
  bin.tilt = 0;
  bin.pulse = 0;

  if (cc) {
    cc.classList.remove("cursor-pointer");
    cc.classList.add("cursor-ew-resize");
  }

  try {
    playTone(580, "sine", 0.12);
  } catch (e) {}
  updateCatcherHUD();
  updateCatcherButtons();

  catcherLastFrameTime = performance.now();
  catcherLoop(catcherLastFrameTime);
}

function handleCatcherMainBtn() {
  if (!catcherStarted) startCatcherGame();
  else initCatcherGame();
}

function toggleCatcherPause() {
  if (!catcherStarted || catcherGameOver) return;
  catcherPaused = !catcherPaused;
  updateCatcherButtons();

  if (!catcherPaused) {
    catcherLastFrameTime = performance.now();
    catcherLoop(catcherLastFrameTime);
  } else {
    drawCatcherOverlay(
      "Simulasi Dijeda",
      "Waktu berhenti sementara · Tekan Lanjut untuk bermain.",
      "▶ Lanjutkan",
    );
  }
}

function spawnFallingAsset() {
  const isValid = Math.random() < 0.74;
  const pool = ASSET_TYPES.filter((a) => a.valid === isValid);
  const type = pool[Math.floor(Math.random() * pool.length)];

  const elapsed = CATCHER_DURATION - catcherTimeLeft;
  const speedBoost = Math.min(2.0, elapsed * 0.12);

  fallingItems.push({
    type,
    x: 68 + Math.random() * (800 - 136),
    y: -26,
    w: 76,
    h: 44,
    vy: 2.9 + Math.random() * 1.1 + speedBoost,
    swayOffset: Math.random() * Math.PI * 2,
  });
}

function drawAssetVectorIcon(typeId, x, y, color) {
  cx.save();
  cx.strokeStyle = color;
  cx.fillStyle = color;
  cx.lineWidth = 1.6;
  cx.lineCap = "round";
  cx.lineJoin = "round";

  if (typeId === "cam") {
    catcherRoundRect(cx, x - 9, y - 5, 13, 10, 2);
    cx.stroke();
    cx.beginPath();
    cx.moveTo(x + 4, y - 3);
    cx.lineTo(x + 9, y - 5);
    cx.lineTo(x + 9, y + 5);
    cx.lineTo(x + 4, y + 3);
    cx.closePath();
    cx.stroke();
  } else if (typeId === "script") {
    catcherRoundRect(cx, x - 7, y - 8, 14, 16, 2);
    cx.stroke();
    cx.beginPath();
    cx.moveTo(x - 4, y - 3);
    cx.lineTo(x + 4, y - 3);
    cx.moveTo(x - 4, y + 1);
    cx.lineTo(x + 4, y + 1);
    cx.moveTo(x - 4, y + 5);
    cx.lineTo(x + 1, y + 5);
    cx.stroke();
  } else if (typeId === "mic") {
    catcherRoundRect(cx, x - 3.5, y - 8, 7, 11, 3.5);
    cx.stroke();
    cx.beginPath();
    cx.arc(x, y - 1, 6.5, 0, Math.PI);
    cx.moveTo(x, y + 5.5);
    cx.lineTo(x, y + 9);
    cx.moveTo(x - 4, y + 9);
    cx.lineTo(x + 4, y + 9);
    cx.stroke();
  } else if (typeId === "edit") {
    catcherRoundRect(cx, x - 9, y - 7, 18, 12, 2);
    cx.stroke();
    cx.beginPath();
    cx.moveTo(x - 5, y + 8);
    cx.lineTo(x + 5, y + 8);
    cx.moveTo(x - 5, y - 2);
    cx.lineTo(x + 1, y - 2);
    cx.moveTo(x - 2, y + 1);
    cx.lineTo(x + 5, y + 1);
    cx.stroke();
  } else {
    cx.beginPath();
    cx.moveTo(x, y - 8);
    cx.lineTo(x + 8.5, y + 7);
    cx.lineTo(x - 8.5, y + 7);
    cx.closePath();
    cx.stroke();
    cx.beginPath();
    cx.moveTo(x, y - 2.5);
    cx.lineTo(x, y + 2);
    cx.stroke();
    cx.fillRect(x - 0.8, y + 4, 1.6, 1.6);
  }
  cx.restore();
}

function drawCatcherBackground() {
  cx.fillStyle = "#0e1525";
  cx.fillRect(0, 0, 800, 420);

  cx.fillStyle = "rgba(148, 163, 184, 0.12)";
  for (let gx = 40; gx <= 760; gx += 36) {
    for (let gy = 32; gy <= 356; gy += 36) {
      cx.fillRect(gx, gy, 1.5, 1.5);
    }
  }

  cx.strokeStyle = "rgba(148, 163, 184, 0.16)";
  cx.lineWidth = 1.5;
  cx.beginPath();
  cx.moveTo(28, bin.y + 13);
  cx.lineTo(772, bin.y + 13);
  cx.stroke();

  const timeRatio = Math.max(0, Math.min(1, catcherTimeLeft / CATCHER_DURATION));
  cx.fillStyle = "rgba(30, 41, 59, 0.75)";
  cx.fillRect(0, 0, 800, 3.5);
  cx.fillStyle =
    catcherTimeLeft <= 5 ? "#FB7185" : timeRatio < 0.4 ? "#FBBF24" : "#34D399";
  cx.fillRect(0, 0, 800 * timeRatio, 3.5);
}

function drawAssetBin() {
  cx.save();
  cx.translate(bin.x, bin.y);
  cx.rotate(bin.tilt);

  cx.fillStyle = "rgba(0, 0, 0, 0.35)";
  catcherRoundRect(cx, -bin.w / 2 + 4, bin.h / 2 - 1, bin.w - 8, 5, 2.5);
  cx.fill();

  catcherRoundRect(cx, -bin.w / 2, -bin.h / 2, bin.w, bin.h, 8);
  cx.fillStyle = "#1E293B";
  cx.fill();

  const borderCol =
    bin.pulse > 0 ? bin.pulseColor : "rgba(148, 163, 184, 0.45)";
  cx.lineWidth = bin.pulse > 0 ? 2.2 : 1.5;
  cx.strokeStyle = borderCol;
  cx.stroke();

  catcherRoundRect(cx, -bin.w / 2 + 10, -bin.h / 2 + 3, bin.w - 20, 3, 1.5);
  cx.fillStyle = bin.pulse > 0 ? bin.pulseColor : "#38BDF8";
  cx.fill();

  cx.textAlign = "center";
  cx.textBaseline = "middle";
  cx.font = "600 10.5px Inter, sans-serif";
  cx.fillStyle = "#E2E8F0";
  cx.fillText("ASSET BIN", 0, 3);

  cx.restore();
  if (bin.pulse > 0) bin.pulse--;
}

function drawFallingCard(item) {
  cx.save();
  const x = item.x - item.w / 2;
  const y = item.y - item.h / 2;

  catcherRoundRect(cx, x, y, item.w, item.h, 10);
  cx.fillStyle = item.type.valid
    ? "rgba(22, 32, 51, 0.94)"
    : "rgba(38, 22, 30, 0.94)";
  cx.fill();

  cx.lineWidth = 1.4;
  cx.strokeStyle = item.type.valid
    ? "rgba(56, 189, 248, 0.35)"
    : "rgba(251, 113, 133, 0.45)";
  cx.stroke();

  drawAssetVectorIcon(item.type.id, item.x, item.y - 6, item.type.color);

  cx.textAlign = "center";
  cx.textBaseline = "middle";
  cx.font = "600 9px Inter, sans-serif";
  cx.fillStyle = item.type.valid ? "#CBD5E1" : "#FDA4AF";
  cx.fillText(item.type.label, item.x, item.y + 12);

  cx.restore();
}

function drawCatcherOverlay(title, subtitle, btnLabel = "▶ Start") {
  cx.save();
  cx.fillStyle = "rgba(14, 21, 37, 0.84)";
  cx.fillRect(0, 0, 800, 420);

  catcherRoundRect(cx, 200, 135, 400, 150, 14);
  cx.fillStyle = "#1E293B";
  cx.fill();
  cx.lineWidth = 1.5;
  cx.strokeStyle = "rgba(148, 163, 184, 0.3)";
  cx.stroke();

  cx.textAlign = "center";
  cx.textBaseline = "middle";
  cx.font = "bold 18px Inter, sans-serif";
  cx.fillStyle = "#F8FAFC";
  cx.fillText(title, 400, 174);

  cx.font = "12.5px Inter, sans-serif";
  cx.fillStyle = "#94A3B8";
  cx.fillText(subtitle, 400, 205);

  catcherRoundRect(cx, 330, 230, 140, 32, 8);
  cx.fillStyle = "#34D399";
  cx.fill();
  cx.font = "bold 12.5px Inter, sans-serif";
  cx.fillStyle = "#0F172A";
  cx.fillText(btnLabel, 400, 246);
  cx.restore();
}

function finishCatcherSession(reasonTitle) {
  catcherGameOver = true;
  keyL = false;
  keyR = false;
  holdL = false;
  holdR = false;

  if (cc) {
    cc.classList.remove("cursor-ew-resize");
    cc.classList.add("cursor-pointer");
  }

  state.catcherPlays = (state.catcherPlays || 0) + 1;
  state.catcherLastScore = catcherScore;
  if (catcherScore > getCatcherBest()) {
    setCatcherBest(catcherScore);
  }

  const passed = catcherScore >= CATCHER_TARGET_SCORE && catcherLives > 0;
  const firstClear = passed && !(state.minigames && state.minigames[1]);

  if (passed) {
    if (!state.minigames) state.minigames = {};
    state.minigames[1] = true;
  }

  try {
    if (firstClear) {
      confetti();
      showToast(
        `Selesai! Skor ${catcherScore} poin tercatat ke progres (+40 XP).`,
        "success",
      );
      if (typeof addXP === "function") addXP(40);
    } else if (passed) {
      playSound("correct");
      showToast(
        `Selesai! Skor ${catcherScore} poin tersimpan (Rekor: ${getCatcherBest()}).`,
        "success",
      );
    } else {
      playSound("wrong");
      showToast(
        `Skor ${catcherScore}/${CATCHER_TARGET_SCORE} poin. Coba lagi untuk menyelesaikan misi!`,
        "info",
      );
    }
    if (typeof saveState === "function") saveState();
    if (typeof updateUI === "function") updateUI();
  } catch (err) {}

  renderMiniGameTabs();
  renderMainNavTabs();
  updateCatcherHUD();
  updateCatcherButtons();
  drawCatcherBackground();
  drawAssetBin();
  drawCatcherOverlay(
    reasonTitle,
    `Skor: ${catcherScore} poin (${passed ? "Tercatat ke Progres ✔" : `Target: ${CATCHER_TARGET_SCORE} poin`}) · Rekor: ${getCatcherBest()}`,
    "↻ Main Lagi",
  );
}

function catcherLoop(now = performance.now()) {
  if (
    curGame !== 1 ||
    currentTab !== "minigames" ||
    !catcherStarted ||
    catcherPaused ||
    catcherGameOver
  )
    return;

  catcherAnimId = requestAnimationFrame(catcherLoop);

  const dt = Math.min(0.1, Math.max(0, (now - catcherLastFrameTime) / 1000));
  catcherLastFrameTime = now;
  const prevSec = Math.ceil(catcherTimeLeft);
  catcherTimeLeft = Math.max(0, catcherTimeLeft - dt);
  const currSec = Math.ceil(catcherTimeLeft);

  if (currSec !== prevSec) {
    updateCatcherHUD();
    if (currSec > 0 && currSec <= 5) {
      try {
        playTone(880, "sine", 0.05, 0.25);
      } catch (e) {}
    }
  }

  if (catcherTimeLeft <= 0) {
    cancelAnimationFrame(catcherAnimId);
    finishCatcherSession("Waktu 15 Detik Selesai!");
    return;
  }

  catcherTick++;

  const minX = bin.w / 2 + 24;
  const maxX = 800 - bin.w / 2 - 24;
  const moveLeft = keyL || holdL;
  const moveRight = keyR || holdR;

  if (moveLeft || moveRight) {
    pointerTargetX = null;
    const dir = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0);
    const targetVx = dir * bin.maxSpeed;
    bin.vx += (targetVx - bin.vx) * 0.22;
  } else if (pointerTargetX !== null) {
    const dx = pointerTargetX - bin.x;
    bin.vx = dx * 0.24;
  } else {
    bin.vx *= 0.78;
    if (Math.abs(bin.vx) < 0.05) bin.vx = 0;
  }

  bin.x = Math.max(minX, Math.min(maxX, bin.x + bin.vx));
  if (bin.x === minX || bin.x === maxX) bin.vx = 0;

  const targetTilt = Math.max(-0.08, Math.min(0.08, bin.vx * 0.008));
  bin.tilt += (targetTilt - bin.tilt) * 0.2;

  spawnCooldown--;
  if (spawnCooldown <= 0) {
    spawnFallingAsset();
    spawnCooldown = 32;
  }

  drawCatcherBackground();

  for (let i = fallingItems.length - 1; i >= 0; i--) {
    const item = fallingItems[i];
    item.y += item.vy;
    item.x += Math.sin(catcherTick * 0.03 + item.swayOffset) * 0.35;

    drawFallingCard(item);

    const hitX = Math.abs(item.x - bin.x) < (bin.w + item.w) * 0.44;
    const hitY =
      item.y + item.h / 2 >= bin.y - bin.h / 2 &&
      item.y - item.h / 2 <= bin.y + bin.h / 2;

    if (hitX && hitY) {
      if (item.type.valid) {
        catcherScore += 10;
        bin.pulse = 14;
        bin.pulseColor = "#34D399";
        try {
          playTone(640, "sine", 0.09);
        } catch (e) {}
        catcherFloaters.push({
          x: bin.x,
          y: bin.y - 24,
          text: "+10",
          color: "#34D399",
          life: 40,
        });

        if (catcherScore > getCatcherBest()) {
          setCatcherBest(catcherScore);
        }
      } else {
        catcherLives = Math.max(0, catcherLives - 1);
        bin.pulse = 18;
        bin.pulseColor = "#FB7185";
        try {
          playSound("wrong");
        } catch (e) {}
        catcherFloaters.push({
          x: bin.x,
          y: bin.y - 24,
          text: "-1 Nyawa",
          color: "#FB7185",
          life: 45,
        });
      }

      updateCatcherHUD();
      fallingItems.splice(i, 1);

      if (catcherLives <= 0) {
        cancelAnimationFrame(catcherAnimId);
        finishCatcherSession("Nyawa Habis!");
        return;
      }
      continue;
    }

    if (item.y - item.h / 2 > 425) {
      fallingItems.splice(i, 1);
    }
  }

  drawAssetBin();

  for (let i = catcherFloaters.length - 1; i >= 0; i--) {
    const fl = catcherFloaters[i];
    fl.y -= 0.7;
    fl.life--;
    cx.globalAlpha = Math.max(0, fl.life / 40);
    cx.font = "600 12px Inter, sans-serif";
    cx.textAlign = "center";
    cx.fillStyle = fl.color;
    cx.fillText(fl.text, fl.x, fl.y);
    cx.globalAlpha = 1;
    if (fl.life <= 0) catcherFloaters.splice(i, 1);
  }
}

window.addEventListener("blur", () => {
  keyL = false;
  keyR = false;
  holdL = false;
  holdR = false;
  sk = {};
  studioDir = null;
});
const EQALL = [
  { id: "eq1", name: "Naskah & Storyboard", icon: "📜", t: "pra" },
  { id: "eq2", name: "Kamera Cinema 4K", icon: "📹", t: "prod" },
  { id: "eq3", name: "Clip-on Mic", icon: "🎙️", t: "prod" },
  { id: "eq4", name: "Workstation PC Editing", icon: "💻", t: "pasca" },
  { id: "eq5", name: "Surat Izin Lokasi", icon: "📝", t: "pra" },
  { id: "eq6", name: "Color Grading Panel", icon: "🎨", t: "pasca" },
  { id: "eq7", name: "Call Sheet Syuting", icon: "📋", t: "pra" },
  { id: "eq8", name: "Tripod & Gimbal", icon: "🎞️", t: "prod" },
  { id: "eq9", name: "Software Editing", icon: "🎬", t: "pasca" },
  { id: "eq10", name: "Hard Disk Backup", icon: "💾", t: "prod" },
];

const shuffle = (a) => {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

let EQ = EQALL.slice(0, 6);
const SLOTS = [
  ["pra", "SLOT 1: PRAPRODUKSI", "cyanAccent"],
  ["prod", "SLOT 2: PRODUKSI", "coralOrange"],
  ["pasca", "SLOT 3: PASCAPRODUKSI", "freshTeal"],
];
let sel = null,
  tl = { pra: [], prod: [], pasca: [] };

function initTimelineGame() {
  tl = { pra: [], prod: [], pasca: [] };
  sel = null;
  EQ = shuffle(EQALL).slice(0, 6);
  $("timeline-feedback").textContent = "";
  renderTL();
}

function renderTL() {
  const placed = Object.values(tl)
      .flat()
      .map((x) => x.id),
    free = EQ.filter((e) => !placed.includes(e.id));
  $("equipment-inventory").innerHTML = free.length
    ? free
        .map(
          (e) =>
            `<button draggable="true" ondragstart="event.dataTransfer.setData('text/plain','${e.id}');sel='${e.id}'" onclick="sel='${e.id}';renderTL()" class="p-2.5 bg-slate-800 border ${sel === e.id ? "border-goldenYellow bg-goldenYellow/20" : "border-slate-700"} rounded-lg text-sm font-semibold hover:border-cyanAccent flex items-center gap-2"><span class="text-base">${e.icon}</span>${e.name}</button>`,
        )
        .join("")
    : '<p class="text-sm text-slate-300">Semua alat sudah ditempatkan. Tekan Verifikasi.</p>';
  $("timeline-slots").innerHTML = SLOTS.map(
    (s) =>
      `<div onclick="assignToSlot('${s[0]}')" ondragover="event.preventDefault()" ondrop="dropEquipment(event,'${s[0]}')" class="bg-slate-900/90 border-2 border-dashed border-${s[2]}/50 rounded-xl p-4 space-y-3 min-h-[160px] cursor-pointer ${sel ? "ring-2 ring-goldenYellow/60" : ""}"><h4 class="font-bold text-sm text-${s[2]} text-center border-b border-slate-800 pb-2">${s[1]}</h4><div class="space-y-2">${tl[s[0]].map((i) => `<div class="p-2 bg-slate-800 border border-slate-700 rounded-lg text-sm flex justify-between items-center"><span>${i.icon} ${i.name}</span><button onclick="event.stopPropagation();removeFromSlot('${s[0]}','${i.id}')" class="text-coralOrange underline text-xs">Hapus</button></div>`).join("") || '<p class="text-xs text-slate-400 text-center">Ketuk di sini untuk menaruh alat terpilih</p>'}</div></div>`,
  ).join("");
}

function assignToSlot(p) {
  if (!sel) {
    showToast("Pilih alat dulu di kotak bawah.", "info");
    return;
  }
  const it = EQ.find((x) => x.id === sel);
  if (!it) return;
  Object.keys(tl).forEach((k) => (tl[k] = tl[k].filter((x) => x.id !== it.id)));
  tl[p].push(it);
  sel = null;
  playSound("xp");
  renderTL();
}

function dropEquipment(e, p) {
  e.preventDefault();
  const id = e.dataTransfer.getData("text/plain");
  if (id) {
    sel = id;
    assignToSlot(p);
  }
}

function removeFromSlot(p, id) {
  tl[p] = tl[p].filter((x) => x.id !== id);
  renderTL();
}

function checkTimelineGame() {
  const placed = Object.values(tl).flat().length,
    fb = $("timeline-feedback");
  if (placed < EQ.length) {
    fb.innerHTML =
      '<span class="text-goldenYellow">Tempatkan semua alat dulu (' +
      placed +
      "/" +
      EQ.length +
      ").</span>";
    return;
  }
  let ok = 0;
  SLOTS.forEach((s) =>
    tl[s[0]].forEach((i) => {
      if (i.t === s[0]) ok++;
    }),
  );
  if (ok === EQ.length) {
    playSound("correct");
    fb.innerHTML =
      '<span class="text-freshTeal">✔ Sempurna! Semua ' +
      ok +
      " alat & dokumen tepat!</span>";
    if (!state.minigames[2]) {
      state.minigames[2] = true;
      addXP(50);
      switchMiniGameTabsRefresh();
    }
  } else {
    playSound("wrong");
    fb.innerHTML =
      '<span class="text-coralOrange">✖ ' +
      ok +
      "/" +
      EQ.length +
      " benar. Ada alat di tahap yang salah; periksa lagi SOP.</span>";
  }
}

let sc,
  sx,
  studioAnimId,
  sp = {
    x: 400,
    y: 210,
    vx: 0,
    vy: 0,
    maxSpeed: 4.2,
    tx: null,
    ty: null,
    targetZone: null,
    angle: 0,
  },
  studioDir = null,
  sk = {},
  nearZone = null,
  activeStationId = null,
  studioTick = 0,
  studioParticles = [],
  studioFloaters = [],
  stationChecks = { client: {}, pra: {}, prod: {}, pasca: {} };

const ZONES = [
  {
    id: "client",
    step: 1,
    name: "Meja Klien",
    sub: "Brief & Kontrak",
    x: 175,
    y: 112,
    r: 34,
    c: "#EAB308",
    crew: "Klien & Produser",
    intro:
      "Klien menginginkan video promosi yang menonjolkan aroma serta kehangatan produk. Pastikan parameter kerja terkunci sebelum tim mulai merancang konsep.",
    tasks: [
      {
        id: "c1",
        label: "Kunci pesan utama & target audiens",
        ok: true,
        hint: "Arah komunikasi iklan telah disepakati bersama.",
      },
      {
        id: "c2",
        label: "Tetapkan batas kuota revisi (maks. 2x)",
        ok: true,
        hint: "Melindungi tim dari perubahan konsep tanpa batas.",
      },
      {
        id: "c3",
        label: "Sahkan jadwal rilis & anggaran produksi",
        ok: true,
        hint: "Timeline dan budget resmi terkunci.",
      },
      {
        id: "c4",
        label: "Mulai syuting tanpa approval brief tertulis",
        ok: false,
        trap: "Syuting tanpa brief tertulis berisiko memicu perombakan konsep di tengah jalan tanpa dasar kontrak.",
      },
    ],
    nextTab: ["proyek", "Lanjut ke Lembar Proyek", "bg-goldenYellow text-midnight"],
  },
  {
    id: "pra",
    step: 2,
    name: "Praproduksi",
    sub: "Storyboard & Jadwal",
    x: 625,
    y: 112,
    r: 34,
    c: "#38BDF8",
    crew: "Sutradara",
    intro:
      "Siapkan dokumen perencanaan teknis agar pengambilan gambar di lapangan berjalan sesuai urutan adegan.",
    tasks: [
      {
        id: "p1",
        label: "Finalisasi urutan shot & angle di storyboard",
        ok: true,
        hint: "Setiap adegan memiliki panduan visual yang jelas.",
      },
      {
        id: "p2",
        label: "Terbitkan call sheet & pembagian tugas kru",
        ok: true,
        hint: "Seluruh kru mengetahui jadwal dan tanggung jawabnya.",
      },
      {
        id: "p3",
        label: "Siapkan izin lokasi & contingency plan cuaca",
        ok: true,
        hint: "Lokasi aman secara legal dan tersedia rencana cadangan.",
      },
      {
        id: "p4",
        label: "Gunakan lagu komersial viral tanpa lisensi",
        ok: false,
        trap: "Lagu komersial tanpa lisensi akan terkena klaim hak cipta dan memblokir penayangan iklan klien.",
      },
    ],
    nextTab: ["materi", "Tinjau SOP Praproduksi", "bg-cyanAccent text-midnight"],
  },
  {
    id: "prod",
    step: 3,
    name: "Produksi",
    sub: "Set Kamera & Audio",
    x: 625,
    y: 308,
    r: 34,
    c: "#FB7185",
    crew: "Kamerawan & Soundman",
    intro:
      "Kalibrasi pengaturan kamera, tata cahaya, dan perekaman suara sebelum pengambilan gambar dimulai.",
    tasks: [
      {
        id: "r1",
        label: "Atur white balance, ISO & framing kamera",
        ok: true,
        hint: "Eksposur dan komposisi gambar tajam serta natural.",
      },
      {
        id: "r2",
        label: "Nyalakan tata cahaya 3-point lighting",
        ok: true,
        hint: "Key, fill, dan back light aktif menerangi subjek.",
      },
      {
        id: "r3",
        label: "Pasang clip-on mic & cek level audio",
        ok: true,
        hint: "Suara dialog terekam jernih tanpa noise berlebih.",
      },
      {
        id: "r4",
        label: "Gunakan digital zoom maksimal dari jarak jauh",
        ok: false,
        trap: "Digital zoom memecah ketajaman piksel. Dekatkan posisi kamera atau gunakan lensa optik.",
      },
    ],
    nextTab: ["misi", "Buka Studi Kasus", "bg-coralOrange text-warmWhite"],
  },
  {
    id: "pasca",
    step: 4,
    name: "Pascaproduksi",
    sub: "Editing & Finishing",
    x: 175,
    y: 308,
    r: 34,
    c: "#34D399",
    crew: "Editor & Colorist",
    intro:
      "Kelola aset rekaman mentah dan selesaikan tahap penyuntingan sesuai standar kualitas rilis.",
    tasks: [
      {
        id: "e1",
        label: "Backup footage RAW ke dual storage (offloading)",
        ok: true,
        hint: "Data mentah aman tersimpan di dua media terpisah.",
      },
      {
        id: "e2",
        label: "Susun rough cut sesuai alur storyboard",
        ok: true,
        hint: "Struktur cerita dan ritme potongan klip terbentuk.",
      },
      {
        id: "e3",
        label: "Selaraskan color grading & audio mixing",
        ok: true,
        hint: "Tone warna konsisten dan level audio seimbang.",
      },
      {
        id: "e4",
        label: "Format kartu memori sebelum rendering selesai",
        ok: false,
        trap: "Jangan memformat kartu memori sebelum backup dan render selesai agar data tidak hilang.",
      },
    ],
    nextTab: ["G2", "Lanjut ke Game Timeline", "bg-freshTeal text-midnight"],
  },
];

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function syncStationChecksFromVisited() {
  ZONES.forEach((z) => {
    if (!stationChecks[z.id]) stationChecks[z.id] = {};
    if (state.visited[z.id]) {
      z.tasks.forEach((t) => {
        if (t.ok) stationChecks[z.id][t.id] = true;
      });
    }
  });
}

function getStationProgress(z) {
  const map = stationChecks[z.id] || {};
  const validTasks = z.tasks.filter((t) => t.ok);
  const done = validTasks.filter((t) => map[t.id]).length;
  return { done, total: validTasks.length, complete: done === validTasks.length };
}

function spawnStudioBurst(x, y, color) {
  for (let i = 0; i < 16; i++) {
    const ang = (Math.PI * 2 * i) / 16;
    const spd = 1.2 + Math.random() * 2;
    studioParticles.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 36,
      maxLife: 36,
      size: 2.5,
      color,
    });
  }
}

function spawnStudioFloater(x, y, text, color) {
  studioFloaters.push({ x, y, text, color, life: 50 });
}

function shuffleAllStationTasks() {
  ZONES.forEach((z) => {
    if (Object.keys(stationChecks[z.id] || {}).length > 0) return;
    for (let i = z.tasks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [z.tasks[i], z.tasks[j]] = [z.tasks[j], z.tasks[i]];
    }
  });
}

function initStudioGame() {
  cancelAnimationFrame(studioAnimId);
  sc = $("studioCanvas");
  sx = sc.getContext("2d");
  shuffleAllStationTasks();
  syncStationChecksFromVisited();
  sp.x = 400;
  sp.y = 210;
  sp.vx = 0;
  sp.vy = 0;
  sp.tx = null;
  sp.ty = null;
  sp.targetZone = null;
  activeStationId = null;
  closeStudioDialog();
  $("studio-visited").textContent = Object.keys(state.visited).length + "/4";
  studioLoop();
}

function resetStudioSimulation() {
  state.visited = {};
  stationChecks = { client: {}, pra: {}, prod: {}, pasca: {} };
  studioParticles = [];
  studioFloaters = [];
  saveState();
  initStudioGame();
  playTone(520, "triangle", 0.1);
  showToast("Kalibrasi studio direset.", "info");
}

function drawStudioEnvironment() {
  sx.fillStyle = "#0e1525";
  sx.fillRect(0, 0, 800, 420);

  sx.fillStyle = "rgba(148, 163, 184, 0.14)";
  for (let gx = 40; gx <= 760; gx += 32) {
    for (let gy = 36; gy <= 384; gy += 32) {
      sx.fillRect(gx, gy, 1.5, 1.5);
    }
  }

  sx.strokeStyle = "rgba(148, 163, 184, 0.16)";
  sx.lineWidth = 1.5;
  drawRoundedRect(sx, 20, 18, 760, 384, 16);
  sx.stroke();

  const links = [
    [ZONES[0], ZONES[1]],
    [ZONES[1], ZONES[2]],
    [ZONES[2], ZONES[3]],
    [ZONES[3], ZONES[0]],
  ];

  links.forEach(([a, b]) => {
    const aDone = getStationProgress(a).complete;
    const bDone = getStationProgress(b).complete;
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const pad = a.r + 12;
    const x1 = a.x + Math.cos(ang) * pad;
    const y1 = a.y + Math.sin(ang) * pad;
    const x2 = b.x - Math.cos(ang) * pad;
    const y2 = b.y - Math.sin(ang) * pad;

    sx.save();
    sx.beginPath();
    sx.moveTo(x1, y1);
    sx.lineTo(x2, y2);

    if (aDone && bDone) {
      sx.strokeStyle = "rgba(52, 211, 153, 0.65)";
      sx.lineWidth = 2;
    } else if (aDone) {
      sx.strokeStyle = "rgba(148, 163, 184, 0.45)";
      sx.lineWidth = 1.5;
      sx.setLineDash([6, 6]);
      sx.lineDashOffset = -(studioTick * 0.45);
    } else {
      sx.strokeStyle = "rgba(148, 163, 184, 0.18)";
      sx.lineWidth = 1.5;
      sx.setLineDash([4, 6]);
    }
    sx.stroke();
    sx.restore();
  });

  const totalReady = ZONES.filter((z) => getStationProgress(z).complete).length;
  sx.save();
  sx.beginPath();
  sx.arc(400, 210, 26, 0, Math.PI * 2);
  sx.strokeStyle =
    totalReady === 4 ? "rgba(52, 211, 153, 0.4)" : "rgba(148, 163, 184, 0.15)";
  sx.lineWidth = 1.5;
  sx.stroke();

  sx.textAlign = "center";
  sx.textBaseline = "middle";
  sx.font = "600 10px Inter, sans-serif";
  sx.fillStyle = totalReady === 4 ? "#34D399" : "#64748B";
  sx.fillText(totalReady + "/4", 400, 210);
  sx.restore();
}

function drawCustomStationIcon(z, prog) {
  const strokeCol = prog.complete ? "#34D399" : z.c;
  sx.save();
  sx.strokeStyle = strokeCol;
  sx.fillStyle = strokeCol;
  sx.lineWidth = 2;
  sx.lineCap = "round";
  sx.lineJoin = "round";

  if (z.id === "client") {
    drawRoundedRect(sx, z.x - 13, z.y - 10, 18, 22, 3);
    sx.stroke();
    sx.beginPath();
    sx.moveTo(z.x - 9, z.y - 4);
    sx.lineTo(z.x + 1, z.y - 4);
    sx.moveTo(z.x - 9, z.y + 1);
    sx.lineTo(z.x + 1, z.y + 1);
    sx.moveTo(z.x - 9, z.y + 6);
    sx.lineTo(z.x - 3, z.y + 6);
    sx.stroke();
    sx.beginPath();
    sx.arc(z.x + 11, z.y + 5, 4.5, 0, Math.PI * 2);
    sx.stroke();
  } else if (z.id === "pra") {
    drawRoundedRect(sx, z.x - 14, z.y - 11, 28, 22, 3);
    sx.stroke();
    sx.beginPath();
    sx.moveTo(z.x, z.y - 11);
    sx.lineTo(z.x, z.y + 11);
    sx.moveTo(z.x - 14, z.y);
    sx.lineTo(z.x + 14, z.y);
    sx.stroke();
  } else if (z.id === "prod") {
    drawRoundedRect(sx, z.x - 14, z.y - 8, 20, 16, 3);
    sx.stroke();
    sx.beginPath();
    sx.moveTo(z.x + 6, z.y - 4);
    sx.lineTo(z.x + 14, z.y - 7);
    sx.lineTo(z.x + 14, z.y + 7);
    sx.lineTo(z.x + 6, z.y + 4);
    sx.closePath();
    sx.stroke();
    sx.beginPath();
    sx.arc(z.x - 8, z.y - 11, 3, 0, Math.PI * 2);
    sx.arc(z.x - 1, z.y - 11, 3, 0, Math.PI * 2);
    sx.stroke();
  } else if (z.id === "pasca") {
    drawRoundedRect(sx, z.x - 15, z.y - 11, 30, 18, 3);
    sx.stroke();
    sx.beginPath();
    sx.moveTo(z.x - 5, z.y + 7);
    sx.lineTo(z.x + 5, z.y + 7);
    sx.moveTo(z.x, z.y + 7);
    sx.lineTo(z.x, z.y + 11);
    sx.moveTo(z.x - 8, z.y + 11);
    sx.lineTo(z.x + 8, z.y + 11);
    sx.stroke();
    const map = stationChecks[z.id] || {};
    const activeAnim = map["e2"] || map["e3"];
    for (let i = 0; i < 3; i++) {
      const w = activeAnim ? 6 + Math.sin(studioTick * 0.1 + i) * 3 : 7;
      sx.fillRect(z.x - 11 + i * 8, z.y - 4 + (i % 2) * 4, w, 2.5);
    }
  }
  sx.restore();
}

function drawStationProps(z, prog) {
  const map = stationChecks[z.id] || {};
  const isNear = nearZone && nearZone.id === z.id;
  sx.save();

  if (z.id === "prod" && map["r2"]) {
    const grad = sx.createRadialGradient(z.x, z.y, 6, z.x, z.y, 68);
    grad.addColorStop(0, "rgba(251, 191, 36, 0.2)");
    grad.addColorStop(1, "rgba(251, 191, 36, 0)");
    sx.fillStyle = grad;
    sx.beginPath();
    sx.arc(z.x, z.y, 68, 0, Math.PI * 2);
    sx.fill();
  }

  sx.beginPath();
  sx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
  sx.fillStyle = prog.complete
    ? "rgba(52, 211, 153, 0.12)"
    : isNear
      ? "rgba(30, 41, 59, 0.95)"
      : "rgba(15, 23, 42, 0.9)";
  sx.fill();

  sx.lineWidth = isNear ? 2.5 : 1.8;
  sx.strokeStyle = prog.complete ? "#34D399" : isNear ? z.c : "rgba(148, 163, 184, 0.35)";
  sx.stroke();

  if (prog.done > 0) {
    sx.beginPath();
    sx.arc(
      z.x,
      z.y,
      z.r + 4,
      -Math.PI / 2,
      -Math.PI / 2 + (Math.PI * 2 * prog.done) / prog.total,
    );
    sx.strokeStyle = prog.complete ? "#34D399" : z.c;
    sx.lineWidth = 2.5;
    sx.stroke();
  }

  drawCustomStationIcon(z, prog);

  sx.beginPath();
  sx.arc(z.x + 24, z.y - 24, 9.5, 0, Math.PI * 2);
  sx.fillStyle = prog.complete ? "#34D399" : "#1E293B";
  sx.fill();
  sx.lineWidth = 1.5;
  sx.strokeStyle = prog.complete ? "#34D399" : z.c;
  sx.stroke();

  sx.textAlign = "center";
  sx.textBaseline = "middle";
  sx.font = "bold 10px Inter, sans-serif";
  sx.fillStyle = prog.complete ? "#0F172A" : "#E2E8F0";
  sx.fillText(prog.complete ? "✓" : z.step, z.x + 24, z.y - 24);

  sx.font = "600 12px Inter, sans-serif";
  sx.fillStyle = "#F8FAFC";
  sx.fillText(z.name, z.x, z.y + z.r + 17);

  sx.font = "11px Inter, sans-serif";
  sx.fillStyle = prog.complete ? "#34D399" : "#94A3B8";
  sx.fillText(
    prog.complete ? "Siap Produksi" : `${z.sub} (${prog.done}/${prog.total})`,
    z.x,
    z.y + z.r + 32,
  );

  sx.restore();
}

function studioLoop() {
  if (curGame !== 3 || currentTab !== "minigames") return;
  studioTick++;

  let ix = 0,
    iy = 0;
  const k = (n) => sk[n];
  if (studioDir === "up" || k("w") || k("arrowup")) iy -= 1;
  if (studioDir === "down" || k("s") || k("arrowdown")) iy += 1;
  if (studioDir === "left" || k("a") || k("arrowleft")) ix -= 1;
  if (studioDir === "right" || k("d") || k("arrowright")) ix += 1;

  let tvx = 0,
    tvy = 0;

  if (ix !== 0 || iy !== 0) {
    const len = Math.hypot(ix, iy);
    tvx = (ix / len) * sp.maxSpeed;
    tvy = (iy / len) * sp.maxSpeed;
    sp.tx = null;
    sp.ty = null;
    sp.targetZone = null;
  } else if (sp.tx !== null && sp.ty !== null) {
    const dx = sp.tx - sp.x;
    const dy = sp.ty - sp.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 4) {
      const desiredSpeed = Math.min(sp.maxSpeed, dist * 0.16);
      tvx = (dx / dist) * desiredSpeed;
      tvy = (dy / dist) * desiredSpeed;
    } else {
      sp.x = sp.tx;
      sp.y = sp.ty;
      sp.vx = 0;
      sp.vy = 0;
      const arrivedZone = sp.targetZone;
      sp.tx = null;
      sp.ty = null;
      sp.targetZone = null;
      if (arrivedZone) openZoneDialog(arrivedZone);
    }
  }

  sp.vx += (tvx - sp.vx) * 0.22;
  sp.vy += (tvy - sp.vy) * 0.22;

  if (Math.abs(sp.vx) < 0.02) sp.vx = 0;
  if (Math.abs(sp.vy) < 0.02) sp.vy = 0;

  sp.x = Math.max(40, Math.min(760, sp.x + sp.vx));
  sp.y = Math.max(40, Math.min(380, sp.y + sp.vy));

  if (Math.hypot(sp.vx, sp.vy) > 0.2) {
    sp.angle = Math.atan2(sp.vy, sp.vx);
  }

  drawStudioEnvironment();

  nearZone = null;
  ZONES.forEach((z) => {
    if (Math.hypot(sp.x - z.x, sp.y - z.y) < z.r + 24) nearZone = z;
  });

  ZONES.forEach((z) => {
    const prog = getStationProgress(z);
    drawStationProps(z, prog);
  });

  if (sp.tx !== null && sp.ty !== null) {
    sx.beginPath();
    sx.arc(sp.tx, sp.ty, 5 + Math.sin(studioTick * 0.18) * 1.5, 0, Math.PI * 2);
    sx.strokeStyle = "rgba(56, 189, 248, 0.55)";
    sx.lineWidth = 1.5;
    sx.stroke();
  }

  sx.save();
  sx.beginPath();
  sx.ellipse(sp.x, sp.y + 13, 11, 4.5, 0, 0, Math.PI * 2);
  sx.fillStyle = "rgba(0, 0, 0, 0.38)";
  sx.fill();

  const dirX = sp.x + Math.cos(sp.angle) * 15;
  const dirY = sp.y + Math.sin(sp.angle) * 15;
  sx.beginPath();
  sx.arc(dirX, dirY, 2.5, 0, Math.PI * 2);
  sx.fillStyle = "#38BDF8";
  sx.fill();

  sx.beginPath();
  sx.arc(sp.x, sp.y, 12, 0, Math.PI * 2);
  sx.fillStyle = "#1E293B";
  sx.fill();
  sx.lineWidth = 2.5;
  sx.strokeStyle = "#38BDF8";
  sx.stroke();

  sx.beginPath();
  sx.arc(sp.x, sp.y, 4, 0, Math.PI * 2);
  sx.fillStyle = "#F8FAFC";
  sx.fill();

  sx.textAlign = "center";
  sx.textBaseline = "middle";
  sx.font = "600 10px Inter, sans-serif";
  sx.fillStyle = "#94A3B8";
  sx.fillText(state.player.role, sp.x, sp.y - 21);

  if (nearZone) {
    const label = "Enter / OK: Buka Kalibrasi";
    sx.font = "600 10.5px Inter, sans-serif";
    const w = sx.measureText(label).width + 14;
    const bx = Math.max(12, Math.min(788 - w, sp.x - w / 2));
    const by = sp.y > 325 ? sp.y - 46 : sp.y + 22;

    drawRoundedRect(sx, bx, by, w, 19, 6);
    sx.fillStyle = "rgba(15, 23, 42, 0.92)";
    sx.fill();
    sx.strokeStyle = "rgba(148, 163, 184, 0.35)";
    sx.lineWidth = 1;
    sx.stroke();

    sx.fillStyle = "#E2E8F0";
    sx.fillText(label, bx + w / 2, by + 9.5);
  }
  sx.restore();

  for (let i = studioParticles.length - 1; i >= 0; i--) {
    const pt = studioParticles[i];
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life--;
    sx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    sx.fillStyle = pt.color;
    sx.beginPath();
    sx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    sx.fill();
    sx.globalAlpha = 1;
    if (pt.life <= 0) studioParticles.splice(i, 1);
  }

  for (let i = studioFloaters.length - 1; i >= 0; i--) {
    const fl = studioFloaters[i];
    fl.y -= 0.55;
    fl.life--;
    sx.globalAlpha = Math.max(0, fl.life / 50);
    sx.font = "600 11px Inter, sans-serif";
    sx.textAlign = "center";
    sx.fillStyle = fl.color;
    sx.fillText(fl.text, fl.x, fl.y);
    sx.globalAlpha = 1;
    if (fl.life <= 0) studioFloaters.splice(i, 1);
  }

  studioAnimId = requestAnimationFrame(studioLoop);
}

function interactStudioZone() {
  if (nearZone) openZoneDialog(nearZone);
  else showToast("Dekati atau klik salah satu meja kerja dulu.", "info");
}

$("studioCanvas").addEventListener("click", (e) => {
  const r = sc.getBoundingClientRect();
  const cxPos = ((e.clientX - r.left) * 800) / r.width;
  const cyPos = ((e.clientY - r.top) * 420) / r.height;

  const clickedZone = ZONES.find(
    (z) => Math.hypot(cxPos - z.x, cyPos - z.y) <= z.r + 16,
  );

  if (clickedZone) {
    if (Math.hypot(sp.x - clickedZone.x, sp.y - clickedZone.y) < clickedZone.r + 24) {
      openZoneDialog(clickedZone);
    } else {
      sp.tx = clickedZone.x;
      sp.ty = clickedZone.y;
      sp.targetZone = clickedZone;
    }
  } else {
    sp.tx = Math.max(40, Math.min(760, cxPos));
    sp.ty = Math.max(40, Math.min(380, cyPos));
    sp.targetZone = null;
  }
});

document.querySelectorAll("[data-dir]").forEach((b) => {
  const s = (v) => (e) => {
    e.preventDefault();
    studioDir = v ? b.dataset.dir : null;
  };
  ["touchstart", "mousedown"].forEach((ev) =>
    b.addEventListener(ev, s(true), { passive: false }),
  );
  ["touchend", "touchcancel", "mouseup", "mouseleave"].forEach((ev) =>
    b.addEventListener(ev, s(false), { passive: false }),
  );
});

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (
    currentTab === "minigames" &&
    (curGame === 1 || curGame === 3) &&
    !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)
  ) {
    if (k.startsWith("arrow") || k === " ") e.preventDefault();
    if (curGame === 1) {
      if (k === "a" || k === "arrowleft") keyL = true;
      if (k === "d" || k === "arrowright") keyR = true;
    } else {
      sk[k] = true;
      if ((k === "enter" || k === "e") && !e.repeat) interactStudioZone();
    }
  }
});

window.addEventListener("keyup", (e) => {
  const k = e.key.toLowerCase();
  sk[k] = false;
  if (k === "a" || k === "arrowleft") keyL = false;
  if (k === "d" || k === "arrowright") keyR = false;
});

function openZoneDialog(z) {
  syncStationChecksFromVisited();
  activeStationId = z.id;
  const box = $("studio-dialog-box");
  box.classList.remove("hidden");
  renderStationChecklist(z);
}

function renderStationChecklist(z, feedbackMsg = "", isTrap = false) {
  const prog = getStationProgress(z);
  const map = stationChecks[z.id] || {};
  const pct = Math.round((prog.done / prog.total) * 100);

  $("dialog-title").innerHTML =
    `<span class="text-cyanAccent">Tahap ${z.step} ·</span> ${z.name} <span class="text-xs font-normal text-slate-400">(${z.crew})</span>`;
  $("dialog-text").textContent = z.intro;

  const tasksHtml = z.tasks
    .map((t) => {
      const checked = !!map[t.id];
      return `
        <button
          type="button"
          onclick="toggleStationTask('${z.id}', '${t.id}')"
          class="w-full text-left p-2.5 rounded-lg border text-xs md:text-sm transition flex items-start gap-2.5 cursor-pointer ${
            checked
              ? "bg-freshTeal/10 border-freshTeal/60 text-warmWhite"
              : "bg-slate-800/60 border-slate-700/80 hover:border-slate-500 text-slate-200"
          }"
        >
          <span class="w-4 h-4 mt-0.5 rounded flex items-center justify-center text-[11px] font-bold shrink-0 ${
            checked
              ? "bg-freshTeal text-midnight"
              : "border border-slate-500 text-transparent"
          }">✓</span>
          <span class="flex-1 leading-snug">
            <span class="block font-medium">${t.label}</span>
            ${
              checked && t.hint
                ? `<span class="block text-xs text-freshTeal/90 mt-0.5">${t.hint}</span>`
                : ""
            }
          </span>
        </button>
      `;
    })
    .join("");

  const nextZone = ZONES.find((item) => !getStationProgress(item).complete);

  $("dialog-actions").innerHTML = `
    <div class="space-y-2.5">
      <div class="flex justify-between items-center text-xs">
        <span class="text-slate-400">Prosedur Terverifikasi (${prog.done}/${prog.total})</span>
        <span class="font-semibold ${prog.complete ? "text-freshTeal" : "text-slate-300"}">${
          prog.complete ? "Selesai" : pct + "%"
        }</span>
      </div>
      <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
        <div class="h-full transition-all duration-300 ${
          prog.complete ? "bg-freshTeal" : "bg-cyanAccent"
        }" style="width:${pct}%"></div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
        ${tasksHtml}
      </div>

      ${
        feedbackMsg
          ? `<div class="px-3 py-2 rounded-lg border text-xs ${
              isTrap
                ? "bg-coralOrange/10 border-coralOrange/50 text-coralOrange"
                : "bg-freshTeal/10 border-freshTeal/50 text-freshTeal"
            }">${feedbackMsg}</div>`
          : ""
      }

      ${
        prog.complete
          ? `<div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <span class="text-xs text-freshTeal font-medium">Kalibrasi ${z.name} lengkap.</span>
              ${
                nextZone
                  ? `<button type="button" onclick="goToNextStation('${nextZone.id}')" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-warmWhite text-xs font-semibold transition cursor-pointer">
                      Lanjut ke ${nextZone.name} →
                    </button>`
                  : `<button type="button" onclick="${
                      z.nextTab[0] === "G2"
                        ? "switchMiniGame(2)"
                        : `switchTab('${z.nextTab[0]}')`
                    };closeStudioDialog()" class="px-3 py-1.5 rounded-lg ${z.nextTab[2]} text-xs font-bold hover:brightness-110 transition cursor-pointer">
                      ${z.nextTab[1]}
                    </button>`
              }
            </div>`
          : ""
      }
    </div>
  `;
}

function toggleStationTask(zoneId, taskId) {
  const z = ZONES.find((item) => item.id === zoneId);
  if (!z) return;
  const task = z.tasks.find((t) => t.id === taskId);
  if (!task) return;

  if (!task.ok) {
    playSound("wrong");
    const box = $("studio-dialog-box");
    box.classList.remove("studio-shake");
    void box.offsetWidth;
    box.classList.add("studio-shake");
    spawnStudioFloater(z.x, z.y - 24, "Tidak sesuai SOP", "#FB7185");
    renderStationChecklist(z, task.trap, true);
    return;
  }

  if (!stationChecks[zoneId]) stationChecks[zoneId] = {};
  const wasChecked = !!stationChecks[zoneId][taskId];
  stationChecks[zoneId][taskId] = !wasChecked;

  if (!wasChecked) {
    playTone(620, "sine", 0.1);
    spawnStudioFloater(z.x, z.y - 20, "+1 SOP", "#34D399");
  } else {
    playTone(420, "sine", 0.08);
  }

  const prog = getStationProgress(z);
  if (prog.complete && !state.visited[z.id]) {
    state.visited[z.id] = 1;
    playSound("correct");
    spawnStudioBurst(z.x, z.y, z.c);
    spawnStudioFloater(z.x, z.y - 32, "Stasiun Siap", "#34D399");
    $("studio-visited").textContent = Object.keys(state.visited).length + "/4";

    if (Object.keys(state.visited).length === 4) {
      confetti();
      if (!state.minigames[3]) {
        state.minigames[3] = true;
        showToast("Seluruh 4 stasiun studio telah terkalibrasi.", "success");
        addXP(40);
        switchMiniGameTabsRefresh();
      } else {
        showToast("Keempat stasiun kembali siap produksi.", "success");
        saveState();
      }
    } else {
      saveState();
    }
  }

  renderStationChecklist(z);
}

function goToNextStation(nextId) {
  const nz = ZONES.find((item) => item.id === nextId);
  if (!nz) return;
  closeStudioDialog();
  sp.tx = nz.x;
  sp.ty = nz.y;
  sp.targetZone = nz;
}

function closeStudioDialog() {
  activeStationId = null;
  $("studio-dialog-box").classList.add("hidden");
}
const QZ = [
  [
    "Dokumen praproduksi berisi sketsa visual adegan demi adegan beserta catatan sudut kamera adalah...",
    [
      "Storyboard",
      "Call Sheet",
      "Editing Script",
      "Proposal Sponsorship",
    ],
    0,
    "Storyboard memvisualisasikan setiap shot sebelum syuting.",
  ],
  [
    "Untuk rekaman dialog jernih di lokasi outdoor, mikrofon yang paling ideal adalah...",
    [
      "Mic HP",
      "Clip-on",
      "Studio Mic",
      "Stage Mic",
    ],
    1,
    "Lavalier atau boom dekat dengan sumber suara dan mengurangi noise lingkungan.",
  ],
  [
    "Penyusunan awal potongan klip sesuai alur naskah tanpa efek visual dinamakan...",
    [
      "Color Grading",
      "Rough Cut",
      "Audio Mixing",
      "Final Rendering",
    ],
    1,
    "Rough cut adalah susunan kasar pertama sebelum penyempurnaan.",
  ],
  [
    "Mengapa musik Royalty-Free komersial penting pada iklan UMKM?",
    [
      "Menghindari pemblokiran hukum / Copyright Strike",
      "Agar video diedit otomatis",
      "Supaya audio menjadi HD",
      "Hanya formalitas",
    ],
    0,
    "Musik tanpa izin berisiko klaim hak cipta dan penghapusan video.",
  ],
  [
    "Penyesuaian tone warna agar konsisten dan membangun mood hangat dinamakan...",
    [
      "Offline Editing",
      "Color Grading",
      "Sound Effecting",
      "Compositing",
    ],
    1,
    "Color grading mengatur warna dan suasana visual.",
  ],
  [
    "Dokumen yang memuat jadwal, lokasi, daftar kru, dan kebutuhan syuting pada hari tertentu disebut...",
    ["Call Sheet", "Rough Cut", "Brief Klien", "Master File"],
    0,
    "Call sheet dibagikan ke seluruh kru sebelum hari syuting.",
  ],
  [
    "Tindakan paling aman segera setelah syuting selesai adalah...",
    [
      "Menghapus kartu memori agar muat",
      "Menyalin dan mem-backup footage ke dua tempat",
      "Langsung mengunggah footage mentah",
      "Menyimpan hanya di kamera",
    ],
    1,
    "Media offloading dan backup mencegah kehilangan footage.",
  ],
  [
    "Rencana cadangan jika terjadi kendala seperti hujan disebut...",
    ["Contingency plan", "Color script", "Picture lock", "Adendum"],
    0,
    "Contingency plan menyiapkan alternatif agar jadwal tetap berjalan.",
  ],
  [
    "Klien meminta revisi melebihi kuota di kontrak. Langkah profesional adalah...",
    [
      "Menuruti tanpa batas dan tanpa biaya",
      "Menolak tanpa penjelasan",
      "Merujuk kontrak dan menawarkan adendum biaya",
      "Menghilang dari proyek",
    ],
    2,
    "Kontrak dihormati dan klien tetap mendapat solusi.",
  ],
  [
    "Urutan alur kerja produksi multimedia yang benar adalah...",
    [
      "Produksi, Praproduksi, Pascaproduksi",
      "Pascaproduksi, Produksi, Praproduksi",
      "Praproduksi, Produksi, Pascaproduksi",
      "Praproduksi, Pascaproduksi, Produksi",
    ],
    2,
    "Perencanaan dulu, lalu eksekusi, lalu penyempurnaan.",
  ],
];

let QR = [];

function renderQuiz() {
  QR = shuffle(QZ).map((q) => {
    const o = shuffle(q[1].map((t, j) => ({ t, ok: j === q[2] })));
    return { q: q[0], o, ex: q[3] };
  });
  $("quiz-container").innerHTML = QR.map(
    (q, i) =>
      `<div class="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3"><p class="font-bold text-sm">${i + 1}. ${q.q}</p><div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">${q.o.map((o, j) => `<label class="flex items-center space-x-2 p-2.5 rounded-lg bg-slate-800/60 border border-slate-700 hover:border-freshTeal cursor-pointer"><input type="radio" name="quiz-q-${i}" value="${j}" class="accent-freshTeal"><span class="text-slate-300">${"ABCD"[j]}. ${o.t}</span></label>`).join("")}</div><p id="qfb-${i}" class="text-sm font-semibold"></p></div>`,
  ).join("");
  $("quiz-msg").textContent = "";
  $("quiz-retry").classList.add("hidden");
  updateQuizInfo();
}

function updateQuizInfo() {
  $("quiz-tries").textContent = state.quizTries
    ? "Percobaan: " + state.quizTries
    : "Belum dikerjakan";
}

function calculateQuizScore() {
  const m = $("quiz-msg");
  if (
    QR.some(
      (q, i) => !document.querySelector(`input[name="quiz-q-${i}"]:checked`),
    )
  ) {
    m.innerHTML =
      '<span class="text-coralOrange">Jawab semua soal dulu.</span>';
    return;
  }
  let s = 0;
  QR.forEach((q, i) => {
    const v = +document.querySelector(`input[name="quiz-q-${i}"]:checked`)
        .value,
      ok = q.o[v].ok;
    if (ok) s += 10;
    const right = "ABCD"[q.o.findIndex((o) => o.ok)];
    $("qfb-" + i).innerHTML =
      (ok
        ? '<span class="text-freshTeal">✔ Benar. </span>'
        : '<span class="text-coralOrange">✖ Salah. Jawaban benar: ' +
          right +
          ". </span>") +
      '<span class="text-slate-300">Pembahasan: ' +
      q.ex +
      "</span>";
  });
  state.quizTries = (state.quizTries || 0) + 1;
  state.quizScore = Math.max(state.quizScore, s);
  m.innerHTML =
    '<span class="text-freshTeal">Skor percobaan ini: ' +
    s +
    "/100. Nilai terbaik: " +
    state.quizScore +
    "/100.</span>";
  $("quiz-retry").classList.remove("hidden");
  if (!state.quizCompleted) {
    state.quizCompleted = true;
    addXP(100);
  } else saveState();
  updateQuizInfo();
  playSound(s >= 80 ? "correct" : "wrong");
  if (s >= 80) confetti();
}

const PJ = ["client", "pra", "prod", "pasca"];

function saveProjectAssignment(e) {
  e.preventDefault();
  dirty = false;
  PJ.forEach((k) => (state.project[k] = $("proj-" + k).value.trim()));
  const first = !state.projectSaved;
  state.projectSaved = true;
  $("proj-msg").innerHTML =
    '<span class="text-freshTeal">✔ Tersimpan di browser ini.</span>';
  showToast("Laporan proyek tersimpan", "success");
  if (first) addXP(60);
  else saveState();
}

function saveReflection(e) {
  e.preventDefault();
  dirty = false;
  ["q1", "q2"].forEach(
    (k) => (state.reflection[k] = $("ref-" + k).value.trim()),
  );
  const first = !state.reflectionSaved;
  state.reflectionSaved = true;
  $("ref-msg").innerHTML =
    '<span class="text-freshTeal">✔ Refleksi tersimpan di browser ini.</span>';
  showToast("Refleksi tersimpan", "success");
  if (first) addXP(40);
  else saveState();
}

function printCert() {
  try {
    window.print();
  } catch (e) {
    showToast(
      "Cetak tidak tersedia di tampilan ini. Buka halaman di tab baru.",
      "error",
    );
  }
}

const BADGES = [
  [
    "praproduksi",
    "Pakar Praproduksi",
    "📋",
    "Selesaikan Misi 1",
    (s) => s.missions[1],
  ],
  [
    "produksi",
    "Sutradara Lapangan",
    "📹",
    "Selesaikan Misi 2",
    (s) => s.missions[2],
  ],
  [
    "pascaproduksi",
    "Wizard Pascaproduksi",
    "💻",
    "Selesaikan Misi 3",
    (s) => s.missions[3],
  ],
  [
    "gamer",
    "Gamer Studio",
    "🕹️",
    "Selesaikan ke-3 mini game",
    (s) => s.minigames[1] && s.minigames[2] && s.minigames[3],
  ],
  [
    "quizMaster",
    "Master SOP DKV",
    "🎓",
    "Nilai kuis minimal 80",
    (s) => s.quizScore >= 80,
  ],
  [
    "studioMaster",
    "Produser Eksekutif",
    "🏆",
    "Semua misi, game, kuis, proyek, refleksi selesai",
    (s) => pctDone(s) >= 100,
  ],
];

function pctDone(s) {
  const m = Math.min(
    3,
    Math.max(
      Object.values(s.missions || {}).filter(Boolean).length,
      typeof getCompletedMissionNumbers === "function"
        ? getCompletedMissionNumbers().size
        : 0,
    ),
  );
  const g = Math.min(
    3,
    Object.values(s.minigames || {}).filter(Boolean).length,
  );
  const quizVal = Math.max(
    Number(s.quizScore) || 0,
    typeof getBestQuizScore === "function" ? getBestQuizScore() : 0,
  );
  const qDone = s.quizCompleted || quizVal > 0 ? 1 : 0;
  return Math.min(100, Math.round(((m + g + qDone) / 7) * 100));
}

function updateUI(light) {
  const p = state.player,
    m = Object.values(state.missions).filter(Boolean).length,
    g = Object.values(state.minigames).filter(Boolean).length,
    pct = pctDone(state);
  $("nav-player-role").textContent = p.role;
  $("nav-player-level").textContent = p.level;
  $("nav-player-xp").textContent = p.xp;
  $("nav-avatar-icon").textContent = p.avatar;
  $("dash-xp").textContent = p.xp;
  $("catcher-high").textContent = state.high1 || 0;
  $("dash-missions").textContent = m + " / 3";
  $("dash-quiz").textContent = state.quizScore + " / 100";
  $("dash-games").textContent = g + " / 3";
  $("quiz-final-score").textContent = state.quizScore + " / 100";
  $("main-progress-bar").style.width = pct + "%";
  $("progress-percentage-text").textContent = pct + "% Selesai";
  $("cert-player-name").textContent = p.name;
  $("cert-player-school").textContent = p.school;
  $("cert-xp").textContent = p.xp + " XP";
  $("cert-score").textContent = state.quizScore + " / 100";
  $("cert-date").textContent = new Date().toLocaleDateString("id-ID");
  $("cert-text").innerHTML =
    "Telah mengikuti pembelajaran alur kerja produksi multimedia dengan capaian: " +
    m +
    "/3 misi, " +
    g +
    '/3 mini game, dan progres keseluruhan <strong class="text-midnight">' +
    pct +
    "%</strong>.";
const miss = [];
  if (m < 3) miss.push(3 - m + " studi kasus");
  if (g < 3) miss.push(3 - g + " mini game");
  if (!state.quizCompleted && state.quizScore <= 0) miss.push("kuis");
  const open = pct >= 100;
  $("cert-lock").classList.toggle("hidden", open);
  $("printable-certificate").classList.toggle("hidden", !open);
  $("cert-print-btn").disabled = !open;
  $("cert-print-btn").classList.toggle("opacity-50", !open);
  $("cert-missing").textContent = miss.join(", ") + " (progres " + pct + "%)";
  [1, 2, 3].forEach(markMission);
  if (light) return;
  renderJourney();
  BADGES.forEach((b) => {
    if (b[4](state) && !state.badges[b[0]]) {
      state.badges[b[0]] = new Date().toLocaleDateString("id-ID");
      showToast("🏅 Lencana baru: " + b[1], "gold");
      confetti();
      try {
        localStorage.setItem(SKEY, JSON.stringify(state));
      } catch (e) {}
    }
  });
  $("badges-grid").innerHTML = BADGES.map((b, i) => {
    const on = !!state.badges[b[0]];
    return `<button onclick="badgeInfo(${i})" class="text-center p-4 rounded-xl border space-y-2 ${on ? "bg-slate-900 border-goldenYellow" : "bg-slate-900/40 border-slate-700 text-slate-300"} hover:border-cyanAccent"><div class="text-3xl ${on ? "" : "grayscale opacity-60"}">${b[2]}</div><h4 class="font-bold text-sm">${esc(b[1])}</h4><p class="text-xs">${esc(b[3])}</p><span class="inline-block px-2 py-0.5 text-xs rounded-full ${on ? "bg-goldenYellow/20 text-goldenYellow font-bold" : "bg-slate-800 text-slate-300"}">${on ? "Terbuka · " + esc(state.badges[b[0]]) : "Terkunci · ketuk untuk detail"}</span></button>`;
  }).join("");
}

const esc = (t) =>
  String(t == null ? "" : t).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
let dirty = false;
const BPROG = {
  praproduksi: (s) => [s.missions[1] ? 1 : 0, 1],
  produksi: (s) => [s.missions[2] ? 1 : 0, 1],
  pascaproduksi: (s) => [s.missions[3] ? 1 : 0, 1],
  gamer: (s) => [Object.values(s.minigames).filter(Boolean).length, 3],
  quizMaster: (s) => [s.quizScore, 80],
  studioMaster: (s) => [pctDone(s), 100],
};

function badgeInfo(i) {
  const b = BADGES[i],
    on = !!state.badges[b[0]],
    pr = BPROG[b[0]](state),
    pc = Math.min(100, Math.round((pr[0] / pr[1]) * 100));
  $("modal-body").innerHTML =
    `<div class="text-center text-5xl ${on ? "" : "grayscale"}">${b[2]}</div><h3 class="text-xl font-bold text-center text-goldenYellow">${esc(b[1])}</h3><p class="text-sm text-slate-200"><b>Syarat:</b> ${esc(b[3])}</p><p class="text-sm text-slate-200"><b>Status:</b> ${on ? "Didapat pada " + esc(state.badges[b[0]]) : "Belum didapat"}</p>${on ? "" : `<div class="w-full bg-slate-800 h-3 rounded-full overflow-hidden"><div class="bg-cyanAccent h-full" style="width:${pc}%"></div></div><p class="text-sm text-slate-300">Progres ${pc}%</p>`}<button onclick="closeModal()" class="w-full px-4 py-2 rounded-lg bg-cyanAccent text-midnight font-bold">Tutup</button>`;
  $("modal").classList.remove("hidden");
}

function closeModal() {
  $("modal").classList.add("hidden");
}

function renderJourney() {
  const st = [
    ["🧱", "Praproduksi", !!state.missions[1], "misi"],
    ["🎥", "Produksi", !!state.missions[2], "misi"],
    ["✂️", "Pascaproduksi", !!state.missions[3], "misi"],
    ["📝", "Evaluasi", state.quizCompleted, "kuis"],
    [
      "🧠",
      "Jurnal Refleksi",
      state.reflectionSaved,
      "refleksi",
    ],
  ];
  const nx = st.findIndex((x) => !x[2]);
  $("journey").innerHTML = st
    .map(
      (s, i) =>
        `<button onclick="switchTab('${s[3]}')" class="p-3 rounded-xl border-2 text-center ${s[2] ? "border-freshTeal bg-freshTeal/10" : i === nx ? "border-coralOrange bg-coralOrange/10" : "border-slate-700 bg-slate-800/60"} hover:brightness-110"><div class="text-2xl">${s[2] ? "✅" : s[0]}</div><div class="font-bold text-sm">${i + 1}. ${s[1]}</div><div class="text-sm ${s[2] ? "text-freshTeal" : i === nx ? "text-coralOrange" : "text-slate-300"}">${s[2] ? "Selesai" : i === nx ? "Berikutnya" : "Menunggu"}</div></button>`,
    )
    .join("");
}


function renderGlossary() {
  const q = ($("gloss-q").value || "").toLowerCase().trim(),
    r = GL.filter(
      (g) =>
        !q ||
        g[0].toLowerCase().includes(q) ||
        g[1].toLowerCase().includes(q),
    );
  $("gloss-list").innerHTML = r.length
    ? r
        .map(
          (g) =>
            `<div class="border-l-4 border-cyanAccent pl-3"><dt class="font-bold text-goldenYellow">${g[0]}</dt><dd class="text-sm text-slate-200">${g[1]}</dd></div>`,
        )
        .join("")
    : '<p class="text-sm text-slate-300">Istilah tidak ditemukan.</p>';
}

function downloadFile(n, t, type) {
  const a = document.createElement("a");
  a.href = "data:" + type + ";charset=utf-8," + encodeURIComponent(t);
  a.download = n;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function exportResults() {
  const p = state.player || {};
  const m = Math.min(
    3,
    Math.max(
      Object.values(state.missions || {}).filter(Boolean).length,
      typeof getCompletedMissionNumbers === "function"
        ? getCompletedMissionNumbers().size
        : 0,
    ),
  );
  const g = Math.min(
    3,
    Object.values(state.minigames || {}).filter(Boolean).length,
  );
  const bestQuiz = Math.max(
    Number(state.quizScore) || 0,
    typeof getBestQuizScore === "function" ? getBestQuizScore() : 0,
  );
  const tries = Math.max(
    Number(state.quizTries) || 0,
    typeof getQuizAttempts === "function" ? getQuizAttempts() : 0,
  );
  const xp = Math.max(
    Number(p.xp) || 0,
    typeof getRealPlayerXP === "function" ? getRealPlayerXP() : 0,
  );
  const level = Number(p.level) || Math.floor(xp / 100) + 1;

  const rf = state.reflection || {};
  const ref1 = rf.q1 || ($("ref-q1") ? $("ref-q1").value.trim() : "") || "-";
  const ref2 = rf.q2 || ($("ref-q2") ? $("ref-q2").value.trim() : "") || "-";

  const t = [
    "HASIL STUDIO ADVENTURE",
    `Nama: ${p.name || "Siswa DKV"}`,
    `Sekolah/Kelas: ${p.school || "-"}`,
    `Level: ${level}  XP: ${xp}`,
    `Studi kasus selesai: ${m}/3`,
    `Mini game selesai: ${g}/3`,
    `Nilai kuis terbaik: ${bestQuiz}/100 (percobaan: ${tries})`,
    `Progres: ${pctDone(state)}%`,
    `Tanggal: ${new Date().toLocaleString("id-ID")}`,
    "",
    "REFLEKSI",
    `1. ${ref1}`,
    `2. ${ref2}`,
    "",
  ].join("\n");

  downloadFile("hasil-studio-adventure.txt", t, "text/plain");
  showToast("Hasil diunduh. Kirim berkasnya ke guru.", "success");
}

function importBackup(ev) {
  const f = ev.target.files[0];
  ev.target.value = "";
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const s = JSON.parse(r.result);
      if (
        !s ||
        typeof s !== "object" ||
        !s.player ||
        typeof s.player.xp !== "number" ||
        !s.missions
      )
        throw 0;
      const d = clone(DEFAULT_STATE),
        n = Object.assign(d, s);
      n.player = Object.assign(clone(DEFAULT_STATE.player), s.player);
      n.player.name = String(n.player.name).slice(0, 40);
      n.player.school = String(n.player.school).slice(0, 60);
      n.badges = {};
      BADGES.forEach((b) => {
        if (s.badges && s.badges[b[0]])
          n.badges[b[0]] = String(s.badges[b[0]]).slice(0, 20);
      });
      n.settings = Object.assign(
        { big: 0, calm: 0, bgm: 0 },
        s.settings || {},
      );
      state = n;
      saveState();
      initPages();
      applySettings();
      switchTab(currentTab);
      showToast("Progres berhasil dipulihkan", "success");
    } catch (e) {
      showToast("Berkas cadangan tidak valid", "error");
    }
  };
  r.readAsText(f);
}

function confetti() {
  if (state.settings && state.settings.calm) return;
  const c = $("confetti"),
    x = c.getContext("2d");
  c.width = innerWidth;
  c.height = innerHeight;
  const cols = ["#00C2FF", "#FF6B4A", "#FFC857", "#20C997"],
    ps = Array.from({ length: 90 }, () => ({
      x: Math.random() * c.width,
      y: -10,
      vx: Math.random() * 4 - 2,
      vy: Math.random() * 3 + 2,
      s: Math.random() * 6 + 4,
      c: cols[Math.floor(Math.random() * 4)],
    }));
  let n = 0;
  (function f() {
    x.clearRect(0, 0, c.width, c.height);
    ps.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      x.fillStyle = p.c;
      x.fillRect(p.x, p.y, p.s, p.s);
    });
    if (++n < 110) requestAnimationFrame(f);
    else x.clearRect(0, 0, c.width, c.height);
  })();
}

let bgmTimer = null,
  bgmStep = 0;
const NOTES = [262, 330, 392, 330, 294, 349, 440, 349];

function applySettings() {
  const s = state.settings;
  document.documentElement.style.fontSize = s.big ? "18px" : "16px";
  document.body.classList.toggle("calm", !!s.calm);
  clearInterval(bgmTimer);
  if (s.bgm)
    bgmTimer = setInterval(() => {
      playTone(NOTES[bgmStep++ % 8], "sine", 0.5, 0.35);
    }, 650);
  [
    ["btn-bgm", "🎵 Musik", s.bgm],
    ["btn-big", "🔠 Teks Besar", s.big],
    ["btn-calm", "🌿 Kurangi Animasi", s.calm],
  ].forEach((b) => {
    const e = $(b[0]);
    const aktif = !!b[2];
    e.textContent = b[1] + " " + (aktif ? "" : "");
    e.setAttribute("aria-pressed", aktif ? "true" : "false");
    e.className =
      "px-4 py-2 rounded-lg border font-bold text-white shadow-md transition cursor-pointer active:scale-95 " +
      (aktif
        ? "bg-green-600 border-green-400 hover:bg-green-500"
        : "bg-red-600 border-red-400 hover:bg-red-500");
  });
}

function toggleBGM() {
  state.settings.bgm = state.settings.bgm ? 0 : 1;
  if (state.settings.bgm && isMuted)
    showToast("Suara sedang dimatikan (tombol 🔊 di atas).", "info");
  applySettings();
  saveState();
}

function toggleBig() {
  state.settings.big = state.settings.big ? 0 : 1;
  applySettings();
  saveState();
}

function toggleCalm() {
  state.settings.calm = state.settings.calm ? 0 : 1;
  applySettings();
  saveState();
}

document.addEventListener("click", (e) => {
  if (e.target.closest("button")) playTone(660, "square", 0.04, 0.3);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
    closeStudioDialog();
  }
});

document
  .querySelectorAll("[data-dir]")
  .forEach((b) =>
    b.setAttribute(
      "aria-label",
      { up: "Atas", down: "Bawah", left: "Kiri", right: "Kanan" }[b.dataset.dir],
    ),
  );

["project-form", "reflection-form"].forEach((id) =>
  $(id).addEventListener("input", () => {
    dirty = true;
  }),
);

window.addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});

function storageCheck() {
  try {
    localStorage.setItem("__t", "1");
    localStorage.removeItem("__t");
  } catch (err) {
    $("storage-warn").classList.remove("hidden");
  }
}

function initPages() {
  $("input-player-name").value = state.player.name;
  $("input-player-school").value = state.player.school;
  PJ.forEach((k) => ($("proj-" + k).value = state.project[k] || ""));
  $("ref-q1").value = state.reflection.q1 || "";
  $("ref-q2").value = state.reflection.q2 || "";
  $("proj-msg").textContent = "";
  $("ref-msg").textContent = "";
  $("quiz-msg").textContent = "";
  document
    .querySelectorAll("input[type=radio]")
    .forEach((r) => (r.checked = false));
  renderQuiz();
  [1, 2, 3].forEach((n) => {
    $("misi" + n + "-feedback").textContent = "";
    if (!state.missions[n]) {
      const s = $("misi" + n + "-status");
      s.className =
        "px-3 py-1 bg-slate-800 text-slate-300 text-sm rounded-full whitespace-nowrap";
      s.textContent = "Belum Selesai";
    }
  });
}

function confirmLogout() {
  stopGames();
  $("modal-body").innerHTML = `
    <div class="text-center text-4xl"></div>
    <h3 class="text-lg font-bold text-center text-goldenYellow">Keluar dari Studio?</h3>
    <p class="text-sm text-slate-300 text-center">
      Simpan progres untuk dilanjutkan nanti atau hapus progres.
    </p>

    <div class="space-y-2 pt-2">
      <button
        type="button"
        onclick="doLogout(false)"
        class="w-full py-2.5 px-4 rounded-xl bg-cyanAccent text-midnight font-bold text-sm hover:brightness-110 cursor-pointer"
      >
        💾 Keluar & Simpan
      </button>
      <button
        type="button"
        onclick="doLogout(true)"
        class="w-full py-2.5 px-4 rounded-xl bg-coralOrange/20 border border-coralOrange text-coralOrange hover:bg-coralOrange hover:text-midnight font-bold text-sm transition cursor-pointer"
      >
        🔄 Keluar & Reset
      </button>
      <button
        type="button"
        onclick="closeModal()"
        class="w-full py-2 px-4 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-semibold cursor-pointer"
      >
        Batal
      </button>
    </div>
  `;
  $("modal").classList.remove("hidden");
}

function doLogout(resetData) {
  closeModal();
  stopGames();
  dirty = false;

  if (resetData) {
    try {
      localStorage.removeItem(SKEY);
    } catch (e) {}
    state = clone(DEFAULT_STATE);
    initPages();
    saveState();
    $("welcome-resume-badge").classList.add("hidden");
    $("welcome-start-btn").textContent = "Masuk ke Studio";
  }

  clearWelcomeError();
  renderWelcomeScreen();

  const ws = $("welcome-screen");
  ws.classList.remove("hidden", "welcome-exit");
  ws.style.display = "flex";
  ws.scrollTop = 0;

  playTone(440, "sine", 0.12);
  showToast(
    resetData
      ? "Data direset. Silakan masuk sebagai siswa baru."
      : "Berhasil keluar ke halaman awal.",
    "info",
  );
}

function renderWelcomeScreen() {
  const p = state.player;
  $("welcome-name").value = p.name !== "Siswa DKV" ? p.name : "";
  $("welcome-school").value = p.school !== "10 DKV 1" ? p.school : "";

  const pct = pctDone(state);
  if (p.xp > 0 || pct > 0) {
    const badge = $("welcome-resume-badge");
    badge.classList.remove("hidden");
    badge.textContent = `👋 Selamat datang kembali, ${p.name}! (Level ${p.level} · ${p.xp} XP · Progres ${pct}%)`;
    $("welcome-start-btn").textContent = "Lanjutkan Petualangan";
  }
}

function clearWelcomeError() {
  $("welcome-error").classList.add("hidden");
  $("welcome-name").classList.remove("border-coralOrange");
  $("welcome-school").classList.remove("border-coralOrange");
}

function enterStudio() {
  const nameInput = $("welcome-name");
  const schoolInput = $("welcome-school");
  const errEl = $("welcome-error");

  const nameVal = nameInput.value.trim();
  const schoolVal = schoolInput.value.trim();

  clearWelcomeError();

  if (!nameVal || !schoolVal) {
    playSound("wrong");
    errEl.textContent =
      "⚠️ Nama siswa dan sekolah/kelas wajib diisi sebelum masuk.";
    errEl.classList.remove("hidden");
    showToast("Isi Nama dan Kelas terlebih dahulu!", "error");

    if (!nameVal) {
      nameInput.classList.add("border-coralOrange");
      nameInput.focus();
    } else {
      schoolInput.classList.add("border-coralOrange");
      schoolInput.focus();
    }
    return;
  }

  state.player.name = nameVal;
  state.player.school = schoolVal;

  try {
    initPages();
    saveState();
    playSound("levelup");
  } catch (err) {}

  const ws = $("welcome-screen");
  if (state.settings && state.settings.calm) {
    ws.style.display = "none";
    ws.classList.add("hidden");
  } else {
    ws.classList.add("welcome-exit");
    setTimeout(() => {
      ws.style.display = "none";
      ws.classList.add("hidden");
    }, 400);
  }
}

const MAIN_NAV_ITEMS = [
  ["beranda", "🏠 Beranda"],
  ["materi", "📖 SOP Produksi"],
  ["misi", "🎯 Studi Kasus"],
  ["minigames", "🎮 3 Mini Game"],
  ["kuis", "📝 Kuis Evaluasi"],
  ["proyek", "🧩 Tugas Proyek"],
  ["refleksi", "🧠 Jurnal Refleksi"],
  ["lencana", "🏆 Galeri Lencana"],
  ["glosarium", "📚 Glosarium & Pustaka"],
  ["tentang", "ℹ️ Tentang & Rubrik"],
  ["sertifikat", "📜 Sertifikat"],
];

function renderMainNavTabs() {
  let navEl = $("nav-tabs");
  if (!navEl) {
    const navParent = document.querySelector("nav");
    if (navParent) {
      navEl = document.createElement("div");
      navEl.id = "nav-tabs";
      navEl.className =
        "max-w-7xl mx-auto flex flex-wrap gap-1 text-sm font-semibold";
      navParent.appendChild(navEl);
    }
  }
  if (!navEl) return;

  navEl.innerHTML = MAIN_NAV_ITEMS.map(([id, label]) => {
    const active = currentTab === id;
    return `<button type="button" onclick="switchTab('${id}')" class="px-3 py-1.5 rounded-lg transition cursor-pointer ${
      active
        ? "bg-cyanAccent text-midnight font-extrabold shadow"
        : "text-slate-300 hover:bg-slate-800 hover:text-warmWhite"
    }">${label}</button>`;
  }).join("");
}

function renderMiniGameTabs() {
  let mgEl = $("mg-tabs");
  if (!mgEl) {
    const c1 = $("mg-container-1");
    if (c1 && c1.parentNode) {
      mgEl = document.createElement("div");
      mgEl.id = "mg-tabs";
      mgEl.className = "flex flex-wrap items-center gap-2 pb-2";
      c1.parentNode.insertBefore(mgEl, c1);
    }
  }
  if (!mgEl) return;

  const mgDone = (state && state.minigames) || {};
  const games = [
    [1, "🧺 Game 1: Asset Catcher", !!mgDone[1]],
    [2, "🎚️ Game 2: Timeline & Equipment", !!mgDone[2]],
    [3, "🏢 Game 3: Virtual Studio", !!mgDone[3]],
  ];

  mgEl.innerHTML = games
    .map(([num, label, done]) => {
      const active = curGame === num;
      return `<button type="button" onclick="switchMiniGame(${num})" class="px-4 py-2 rounded-xl text-xs md:text-sm font-bold border transition cursor-pointer ${
        active
          ? "bg-cyanAccent text-midnight border-cyanAccent shadow"
          : done
            ? "bg-freshTeal/15 text-freshTeal border-freshTeal/50 hover:bg-freshTeal/25"
            : "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800"
      }">${label}${done ? " ✔" : ""}</button>`;
    })
    .join("");
}

function switchMiniGameTabsRefresh() {
  renderMiniGameTabs();
  renderMainNavTabs();
}

const SLOT_BANK = [
  { id: "s1", ic: "📋", name: "Call Sheet Syuting", stage: "pra" },
  { id: "s2", ic: "📝", name: "Naskah & Storyboard", stage: "pra" },
  { id: "s3", ic: "📍", name: "Izin Lokasi & Budgeting", stage: "pra" },
  { id: "s4", ic: "📹", name: "Kamera Cinema 4K", stage: "prod" },
  { id: "s5", ic: "🎙️", name: "Clip-on Mic", stage: "prod" },
  { id: "s6", ic: "🎥", name: "Tripod & Gimbal", stage: "prod" },
  { id: "s7", ic: "💡", name: "3-Point LED Lighting", stage: "prod" },
  { id: "s8", ic: "🎨", name: "Color Grading Panel", stage: "pasca" },
  { id: "s9", ic: "💻", name: "Workstation PC Editing", stage: "pasca" },
  { id: "s10", ic: "🎧", name: "Audio Mixing & Mastering", stage: "pasca" },
];

let slotItems = [],
  slotPlaced = { pra: [], prod: [], pasca: [] },
  selectedSlotItemId = null,
  slotResultMsg = null;

function initSlots() {
  const shuffled = [...SLOT_BANK];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  slotItems = shuffled.slice(0, 6);
  slotPlaced = { pra: [], prod: [], pasca: [] };
  selectedSlotItemId = null;
  slotResultMsg = null;
  renderSlots();
}

function selectSlotItem(id) {
  selectedSlotItemId = selectedSlotItemId === id ? null : id;
  slotResultMsg = null;
  try {
    playTone(540, "sine", 0.07);
  } catch (e) {}
  renderSlots();
}

function dragSlotItem(e, id) {
  selectedSlotItemId = id;
  if (e.dataTransfer) e.dataTransfer.setData("text/plain", id);
}

function dropInSlot(e, stage) {
  e.preventDefault();
  const id =
    (e.dataTransfer && e.dataTransfer.getData("text/plain")) ||
    selectedSlotItemId;
  if (id) {
    selectedSlotItemId = id;
    placeInSlot(stage);
  }
}

function placeInSlot(stage) {
  if (!selectedSlotItemId) return;
  const item = slotItems.find((x) => x.id === selectedSlotItemId);
  if (!item) return;

  ["pra", "prod", "pasca"].forEach((st) => {
    slotPlaced[st] = slotPlaced[st].filter((x) => x.id !== item.id);
  });
  slotPlaced[stage].push(item);
  selectedSlotItemId = null;
  slotResultMsg = null;

  try {
    playTone(620, "sine", 0.08);
  } catch (e) {}
  renderSlots();
}

function removeFromSlot(e, stage, id) {
  if (e) e.stopPropagation();
  slotPlaced[stage] = slotPlaced[stage].filter((x) => x.id !== id);
  slotResultMsg = null;
  try {
    playTone(420, "sine", 0.07);
  } catch (e) {}
  renderSlots();
}

function verifySlots() {
  const stages = ["pra", "prod", "pasca"];
  let wrongCount = 0;

  stages.forEach((st) => {
    slotPlaced[st].forEach((item) => {
      if (item.stage !== st) wrongCount++;
    });
  });

  if (wrongCount === 0) {
    const firstClear = !(state.minigames && state.minigames[2]);
    if (!state.minigames) state.minigames = {};
    state.minigames[2] = true;

    slotResultMsg = {
      ok: true,
      text: "🎉 Hebat! Semua perangkat & dokumen terpasang pada tahap produksi yang tepat.",
    };

    try {
      if (firstClear) {
        confetti();
        showToast("Game 2 selesai! Tersimpan ke progres (+40 XP).", "success");
        if (typeof addXP === "function") addXP(40);
      } else {
        playSound("correct");
        showToast("Verifikasi berhasil! Semua slot tepat.", "success");
      }
      if (typeof saveState === "function") saveState();
      if (typeof updateUI === "function") updateUI();
    } catch (e) {}

    renderMiniGameTabs();
    renderMainNavTabs();
  } else {
    try {
      playSound("wrong");
    } catch (e) {}
    slotResultMsg = {
      ok: false,
      text: `⚠️ Masih ada ${wrongCount} alat/dokumen yang salah tempat. Tekan tombol Hapus pada alat yang salah lalu pindahkan ke slot yang sesuai.`,
    };
  }

  renderSlots();
}

function renderSlots() {
  const poolEl = $("slot-pool");
  const verifyEl = $("slot-verify-wrap");
  if (!poolEl || !verifyEl) return;

  const placedIds = new Set([
    ...slotPlaced.pra.map((x) => x.id),
    ...slotPlaced.prod.map((x) => x.id),
    ...slotPlaced.pasca.map((x) => x.id),
  ]);

  ["pra", "prod", "pasca"].forEach((st) => {
    const box = $("slot-" + st);
    if (!box) return;
    if (slotPlaced[st].length === 0) {
      box.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">Ketuk di sini untuk menaruh alat terpilih</p>`;
    } else {
      box.innerHTML = slotPlaced[st]
        .map(
          (item) => `
          <div onclick="event.stopPropagation()" class="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-warmWhite">
            <span class="font-semibold">${item.ic} ${item.name}</span>
            <button type="button" onclick="removeFromSlot(event, '${st}', '${item.id}')" class="px-2 py-0.5 rounded bg-coralOrange/20 hover:bg-coralOrange text-coralOrange hover:text-midnight font-bold transition cursor-pointer">
              Hapus
            </button>
          </div>`,
        )
        .join("");
    }
  });

  const remaining = slotItems.filter((x) => !placedIds.has(x.id));
  if (remaining.length === 0) {
    poolEl.innerHTML = `<p class="text-xs text-slate-400">Semua 6 perangkat & dokumen sudah terpasang di slot.</p>`;
  } else {
    poolEl.innerHTML = remaining
      .map((item) => {
        const isSel = selectedSlotItemId === item.id;
        return `
          <button
            type="button"
            draggable="true"
            ondragstart="dragSlotItem(event, '${item.id}')"
            onclick="selectSlotItem('${item.id}')"
            class="px-3.5 py-2 rounded-xl border text-xs md:text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
              isSel
                ? "bg-cyanAccent/20 border-cyanAccent ring-2 ring-cyanAccent text-warmWhite"
                : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
            }"
          >
            <span>${item.ic}</span>
            <span>${item.name}</span>
          </button>`;
      })
      .join("");
  }

  let verifyHtml = "";
  if (slotResultMsg) {
    verifyHtml += `<div class="p-3 mb-2 rounded-xl border text-xs font-semibold ${
      slotResultMsg.ok
        ? "bg-freshTeal/15 border-freshTeal text-freshTeal"
        : "bg-coralOrange/15 border-coralOrange text-coralOrange"
    }">${slotResultMsg.text}</div>`;
  }
  if (placedIds.size === slotItems.length && slotItems.length > 0) {
    verifyHtml += `<button type="button" onclick="verifySlots()" class="w-full py-2.5 px-4 rounded-xl bg-freshTeal text-midnight font-extrabold text-sm hover:brightness-110 transition cursor-pointer">
      ✔ Verifikasi Penempatan Alat
    </button>`;
  }
  verifyEl.innerHTML = verifyHtml;
}

const _origSwitchTab = typeof switchTab === "function" ? switchTab : null;
switchTab = function (t) {
  currentTab = t;
  if (typeof stopGames === "function") stopGames();

  if (_origSwitchTab && _origSwitchTab !== switchTab) {
    try {
      _origSwitchTab(t);
    } catch (e) {}
  } else {
    document
      .querySelectorAll(".tab-content")
      .forEach((el) => el.classList.add("hidden"));
    const panel = $("content-" + t);
    if (panel) panel.classList.remove("hidden");
  }

  renderMainNavTabs();
  if (t === "minigames") {
    renderMiniGameTabs();
  }
};

switchMiniGame = function (n) {
  curGame = n || 1;
  if (typeof stopGames === "function") stopGames();

  [1, 2, 3].forEach((i) => {
    const box = $("mg-container-" + i);
    if (box) {
      box.classList.toggle("hidden", i !== curGame);
      if (i === curGame) box.style.display = "";
    }
  });

  if (curGame === 1 && typeof initCatcherGame === "function") {
    initCatcherGame();
  } else if (curGame === 2) {
    initSlots();
  } else if (curGame === 3 && typeof initStudioGame === "function") {
    initStudioGame();
  }

  renderMiniGameTabs();
};

renderMainNavTabs();
renderMiniGameTabs();
switchTab("beranda");

let quizSessionLocked = false;
const QUIZ_META_KEY = "studio_adventure_quiz_meta_v1";
const USER_PROFILE_KEY = "studio_adventure_user_profile_v1";

const QUIZ_FALLBACK_KEY = [
  { q: /jadwal.*lokasi.*daftar kru/i, a: /call sheet/i },
  { q: /penyesuaian tone warna|mood hangat/i, a: /color grading/i },
  { q: /rencana cadangan|kendala seperti hujan/i, a: /contingency plan/i },
  { q: /royalty-free/i, a: /copyright strike|pemblokiran hukum/i },
  { q: /sketsa visual adegan|catatan sudut kamera/i, a: /storyboard/i },
  { q: /urutan alur kerja produksi/i, a: /^([A-E]\.\s*)?praproduksi,\s*produksi,\s*pascaproduksi/i },
  { q: /penyusunan awal potongan klip|tanpa efek visual/i, a: /rough cut/i },
  { q: /rekaman dialog jernih.*outdoor|mikrofon yang paling ideal/i, a: /clip[\s-]?on|lavalier|shotgun/i },  { q: /tindakan paling aman segera setelah syuting/i, a: /mem-backup footage|dua tempat/i },
  { q: /revisi melebihi kuota/i, a: /merujuk kontrak|adendum biaya/i },
];

const BADGE_CATALOG = [
  {
    id: "b_start",
    icon: "🎬",
    title: "Kru Studio Baru",
    desc: "Memasuki Creative Digital Studio Adventure dan memulai pembelajaran.",
    check: () => true,
  },
  {
    id: "b_misi1",
    icon: "📋",
    title: "Perencana Praproduksi",
    desc: "Menyelesaikan Misi Studi Kasus 1 atau kalibrasi meja Praproduksi.",
    check: (st) => getCompletedMissionNumbers().has(1) || !!st?.visited?.pra,
  },
  {
    id: "b_misi2",
    icon: "🎥",
    title: "Eksekutor Produksi",
    desc: "Menyelesaikan Misi Studi Kasus 2 atau kalibrasi set kamera Produksi.",
    check: (st) => getCompletedMissionNumbers().has(2) || !!st?.visited?.prod,
  },
  {
    id: "b_misi3",
    icon: "💻",
    title: "Spesialis Pascaproduksi",
    desc: "Menyelesaikan Misi Studi Kasus 3 atau kalibrasi workstation Pascaproduksi.",
    check: (st) => getCompletedMissionNumbers().has(3) || !!st?.visited?.pasca,
  },
  {
    id: "b_mg1",
    icon: "🧺",
    title: "Kurator Aset Cepat",
    desc: "Mencapai target skor minimal 50 poin di Game 1: Asset Catcher.",
    check: (st) => !!st?.minigames?.[1],
  },
  {
    id: "b_mg2",
    icon: "🎚️",
    title: "Penata Alur & Alat",
    desc: "Menyelesaikan penempatan perangkat di Game 2: Timeline & Equipment.",
    check: (st) => !!st?.minigames?.[2],
  },
  {
    id: "b_mg3",
    icon: "🏢",
    title: "Kepala Studio Virtual",
    desc: "Mengkalibrasi seluruh 4 stasiun kerja di Game 3: Virtual Studio.",
    check: (st) => !!st?.minigames?.[3],
  },
  {
    id: "b_quiz",
    icon: "📝",
    title: "Ahli SOP Multimedia",
    desc: "Meraih nilai minimal 80 / 100 pada Kuis Evaluasi.",
    check: () => getBestQuizScore() >= 80,
  },
  {
    id: "b_master",
    icon: "🏆",
    title: "Produser Eksekutif",
    desc: "Mencapai 100% Progres Gamifikasi Interaktif (Misi, Mini Game & Kuis).",
    check: () => computeOverallPercent() >= 100,
  },
];

function removeHeaderProducerBox() {
  const headerEl = document.querySelector("header");
  if (!headerEl) return;

  const pillBox = Array.from(headerEl.querySelectorAll("div")).find(
    (el) =>
      el !== headerEl &&
      (el.textContent.includes("XP") || el.textContent.includes("Lv.")) &&
      !el.textContent.includes("StudioAdventure"),
  );
  if (!pillBox) return;

  pillBox.hidden = false;
  pillBox.classList.remove("hidden");

  const roleEl = Array.from(pillBox.querySelectorAll("div, span")).find(
    (el) =>
      /Produser/i.test(el.textContent) &&
      !/Lv\./i.test(el.textContent) &&
      !/XP/i.test(el.textContent) &&
      el.parentElement &&
      (/Lv\./i.test(el.parentElement.textContent) ||
        /XP/i.test(el.parentElement.textContent)),
  );

  if (roleEl) {
    roleEl.hidden = true;
    roleEl.classList.add("hidden");

    const next = roleEl.nextElementSibling;
    if (next && /^(\||\/|•|-)?$/.test(next.textContent.trim())) {
      next.hidden = true;
      next.classList.add("hidden");
    }
  }
}

function saveStudentProfileBackup(profile) {
  if (!profile || !profile.name) return;
  try {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {}
}

function getStudentProfile() {
  let name = "";
  let className = "";
  let school = "";

  if (typeof state !== "undefined" && state) {
    name =
      state.player?.name ||
      state.name ||
      state.nama ||
      state.user?.name ||
      state.student?.name ||
      "";
    className =
      state.player?.className ||
      state.player?.kelas ||
      state.className ||
      state.kelas ||
      "";
    school =
      state.player?.school ||
      state.player?.sekolah ||
      state.school ||
      state.sekolah ||
      "";
  }

  if (!name) {
    try {
      const saved = JSON.parse(localStorage.getItem(USER_PROFILE_KEY) || "null");
      if (saved && saved.name) {
        name = saved.name;
        className = className || saved.className || "";
        school = school || saved.school || "";
      }
    } catch (e) {}
  }

  if (!name) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        const val = localStorage.getItem(k);
        if (!val || val[0] !== "{") continue;
        const parsed = JSON.parse(val);
        const foundName =
          parsed?.player?.name ||
          parsed?.name ||
          parsed?.nama ||
          parsed?.user?.name;
        if (foundName && typeof foundName === "string" && foundName.trim()) {
          name = foundName.trim();
          className =
            className ||
            parsed?.player?.className ||
            parsed?.player?.kelas ||
            parsed?.kelas ||
            "";
          school =
            school ||
            parsed?.player?.school ||
            parsed?.player?.sekolah ||
            parsed?.sekolah ||
            "";
          break;
        }
      }
    } catch (e) {}
  }

  if (!name) {
    const nameInp =
      $("login-name") ||
      $("inp-name") ||
      $("player-name") ||
      document.querySelector('input[placeholder*="Nama" i]');
    if (nameInp && nameInp.value && nameInp.value.trim()) {
      name = nameInp.value.trim();
    }
  }
  if (!className) {
    const clsInp =
      $("login-class") ||
      $("inp-class") ||
      $("player-class") ||
      document.querySelector('input[placeholder*="Kelas" i]');
    if (clsInp && clsInp.value && clsInp.value.trim()) {
      className = clsInp.value.trim();
    }
  }
  if (!school) {
    const schInp =
      $("login-school") ||
      $("inp-school") ||
      $("player-school") ||
      document.querySelector(
        'input[placeholder*="Sekolah" i], input[placeholder*="Instansi" i]',
      );
    if (schInp && schInp.value && schInp.value.trim()) {
      school = schInp.value.trim();
    }
  }

  const result = {
    name: (name || "Peserta DKV").trim(),
    className: (className || "").trim(),
    school: (school || "").trim(),
  };

  if (name) {
    saveStudentProfileBackup(result);
  }
  return result;
}

document.addEventListener(
  "click",
  (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (/Masuk|Mulai|Login|Simpan Profil/i.test(btn.textContent.trim())) {
      setTimeout(() => {
        getStudentProfile();
        syncSertifikatUI();
      }, 50);
    }
  },
  true,
);

function readQuizMeta() {
  try {
    const raw = localStorage.getItem(QUIZ_META_KEY);
    return raw ? JSON.parse(raw) : { best: 0, tries: 0 };
  } catch (e) {
    return { best: 0, tries: 0 };
  }
}

function writeQuizMeta(best, tries) {
  try {
    localStorage.setItem(
      QUIZ_META_KEY,
      JSON.stringify({
        best: Math.min(100, Math.max(0, Number(best) || 0)),
        tries: Math.max(0, Number(tries) || 0),
      }),
    );
  } catch (e) {}
}

function getGlobalQuizBank() {
  try {
    if (typeof KUIS !== "undefined" && Array.isArray(KUIS)) return KUIS;
  } catch (e) {}
  try {
    if (typeof QUIZ !== "undefined" && Array.isArray(QUIZ)) return QUIZ;
  } catch (e) {}
  try {
    if (typeof SOAL !== "undefined" && Array.isArray(SOAL)) return SOAL;
  } catch (e) {}
  try {
    if (typeof QUESTIONS !== "undefined" && Array.isArray(QUESTIONS)) return QUESTIONS;
  } catch (e) {}
  return null;
}

function getRealPlayerXP() {
  if (typeof state === "undefined" || !state) return 0;
  return (
    Number(
      state.player?.xp ??
        state.xp ??
        state.points ??
        state.totalXp ??
        0,
    ) || 0
  );
}

function getBestQuizScore() {
  const meta = readQuizMeta();
  if (typeof state === "undefined" || !state) return meta.best;
  const fromState =
    Number(
      state.bestQuiz ??
        state.quizBest ??
        state.quizHigh ??
        state.quizScore ??
        state.kuisScore ??
        (state.quiz && typeof state.quiz === "object" ? state.quiz.best : 0) ??
        (state.kuis && typeof state.kuis === "object" ? state.kuis.best : 0) ??
        (typeof state.kuis === "number" ? state.kuis : 0),
    ) || 0;
  return Math.min(100, Math.max(0, fromState, meta.best));
}

function setBestQuizScore(score, force = false) {
  const clean = Math.min(100, Math.max(0, Number(score) || 0));
  const best = force ? clean : Math.max(getBestQuizScore(), clean);
  if (typeof state !== "undefined" && state) {
    state.bestQuiz = best;
    state.quizBest = best;
    state.quizHigh = best;
    state.quizScore = best;
    state.kuisScore = best;
    if (state.quiz && typeof state.quiz === "object") state.quiz.best = best;
    if (state.kuis && typeof state.kuis === "object") state.kuis.best = best;
  }
  writeQuizMeta(best, getQuizAttempts());
}

function getQuizAttempts() {
  const meta = readQuizMeta();
  if (typeof state === "undefined" || !state) return meta.tries;
  const fromState =
    Number(
      state.quizTries ??
        state.quizAttempts ??
        state.kuisTries ??
        state.kuisAttempts ??
        state.percobaan ??
        (state.quiz && typeof state.quiz === "object" ? state.quiz.tries : 0) ??
        0,
    ) || 0;
  return Math.max(0, fromState, meta.tries);
}

function setQuizAttempts(val) {
  const clean = Math.max(0, Number(val) || 0);
  if (typeof state !== "undefined" && state) {
    state.quizTries = clean;
    state.quizAttempts = clean;
    state.kuisTries = clean;
    state.kuisAttempts = clean;
    state.percobaan = clean;
    if (state.quiz && typeof state.quiz === "object") state.quiz.tries = clean;
  }
  writeQuizMeta(getBestQuizScore(), clean);
}

function getCompletedMissionNumbers() {
  const doneSet = new Set();

  if (typeof state !== "undefined" && state && Array.isArray(state.doneMisiNums)) {
    state.doneMisiNums.forEach((n) => {
      const num = Number(n);
      if (num >= 1 && num <= 3) doneSet.add(num);
    });
  }

  [1, 2, 3].forEach((mNum) => {
    const card = findMissionCardElement(mNum);
    if (card && /Keputusan tepat/i.test(card.textContent)) {
      doneSet.add(mNum);
    }
  });

  return doneSet;
}

function findMissionCardElement(mNum) {
  const misiSec = $("content-misi");
  if (!misiSec) return null;

  const badgeEl = Array.from(misiSec.querySelectorAll("span, div, p, b")).find(
    (el) =>
      el.children.length === 0 &&
      new RegExp(`^Misi\\s*${mNum}\\s*:`, "i").test(el.textContent.trim()),
  );
  if (!badgeEl) return null;

  let card = badgeEl.parentElement;
  while (
    card &&
    card !== misiSec &&
    !card.querySelector('input[type="radio"]')
  ) {
    card = card.parentElement;
  }
  return card && card !== misiSec ? card : null;
}

function markMissionCompletedInState(mNum) {
  if (typeof state === "undefined" || !state || mNum < 1 || mNum > 3) return;
  if (!Array.isArray(state.doneMisiNums)) {
    state.doneMisiNums = [];
  }
  if (!state.doneMisiNums.includes(mNum)) {
    state.doneMisiNums.push(mNum);
  }
}

function syncMisiStatusUI() {
  const misiSec = $("content-misi");
  if (!misiSec) return;

  const doneSet = getCompletedMissionNumbers();

  [1, 2, 3].forEach((mNum) => {
    const card = findMissionCardElement(mNum);
    if (!card) return;

    const isDone = doneSet.has(mNum);
    if (isDone) {
      markMissionCompletedInState(mNum);
    }

    const statusEl = Array.from(card.querySelectorAll("span, div, p, b")).find(
      (el) =>
        el.children.length === 0 &&
        /^(Belum Selesai|✔\s*Selesai|Selesai)$/i.test(el.textContent.trim()),
    );
    if (statusEl) {
      if (isDone) {
        statusEl.textContent = "✔ Selesai";
        statusEl.className =
          "px-3 py-1 rounded-full text-xs font-bold bg-freshTeal/15 border border-freshTeal/50 text-freshTeal shrink-0";
      } else {
        statusEl.textContent = "Belum Selesai";
        statusEl.className =
          "px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-400 shrink-0";
      }
    }

    const submitBtn = Array.from(card.querySelectorAll("button")).find((btn) =>
      new RegExp(
        `(Kirim Keputusan Misi\\s*${mNum}|Misi\\s*${mNum}\\s*Selesai)`,
        "i",
      ).test(btn.textContent.trim()),
    );
    if (submitBtn) {
      if (isDone) {
        submitBtn.textContent = `✔ Misi ${mNum} Selesai`;
        submitBtn.className =
          "px-4 py-2 rounded-xl bg-freshTeal/20 border border-freshTeal/50 text-freshTeal font-bold text-xs md:text-sm cursor-pointer";
      } else {
        submitBtn.textContent = `Kirim Keputusan Misi ${mNum}`;
        submitBtn.className =
          "px-4 py-2 rounded-xl bg-cyanAccent text-midnight font-extrabold text-xs md:text-sm hover:brightness-110 transition cursor-pointer";
      }
    }
  });
}

function resetMisiDOMElements() {
  const misiSec = $("content-misi");
  if (!misiSec) return;

  misiSec.querySelectorAll('input[type="radio"]').forEach((inp) => {
    inp.checked = false;
    inp.disabled = false;
  });

  misiSec.querySelectorAll("label").forEach((lbl) => {
    lbl.classList.remove(
      "pointer-events-none",
      "border-freshTeal",
      "border-coralOrange",
      "bg-freshTeal/15",
      "bg-coralOrange/15",
    );
  });

  Array.from(misiSec.querySelectorAll("p, div, span")).forEach((el) => {
    if (
      el.children.length === 0 &&
      /(Keputusan tepat|Kurang tepat|Jawaban belum tepat)/i.test(el.textContent)
    ) {
      el.textContent = "";
      el.classList.add("hidden");
    }
  });
}

function computeOverallPercent() {
  if (typeof state === "undefined" || !state) return 0;
  const misiDone = Math.min(3, getCompletedMissionNumbers().size);
  const kuisVal = getBestQuizScore();
  const rawMg = state.minigames || {};
  const mgDone = Math.min(
    3,
    [1, 2, 3].some((k) => rawMg[k] !== undefined)
      ? [1, 2, 3].filter((k) => !!rawMg[k]).length
      : Object.values(rawMg).filter(Boolean).length,
  );
  return Math.min(
    100,
    Math.round(((misiDone + mgDone + kuisVal / 100) / 7) * 100),
  );
}

function persistStateSafely() {
  try {
    if (typeof SKEY !== "undefined" && typeof state !== "undefined") {
      localStorage.setItem(SKEY, JSON.stringify(state));
    }
  } catch (err) {}
}

function ensureGaleriLencanaContainer() {
  let sec =
    $("content-lencana") ||
    $("content-badges") ||
    document.querySelector('[id*="lencana"]');

  if (!sec) {
    const beranda = $("content-beranda");
    const parent = beranda
      ? beranda.parentElement
      : document.querySelector("main") || document.body;
    sec = document.createElement("section");
    sec.id = "content-lencana";
    sec.className = "tab-content max-w-6xl mx-auto space-y-6 hidden";
    parent.appendChild(sec);
  } else {
    sec.id = "content-lencana";
    sec.classList.add("tab-content");
  }

  return sec;
}

function renderGaleriLencana() {
  const sec = ensureGaleriLencanaContainer();
  if (!sec) return;

  if (typeof currentTab !== "undefined" && currentTab === "lencana") {
    sec.classList.remove("hidden");
    sec.style.display = "";
  }

  const st = typeof state !== "undefined" && state ? state : {};
  const unlockedCount = BADGE_CATALOG.filter((b) => b.check(st)).length;
  const totalCount = BADGE_CATALOG.length;

  const cardsHtml = BADGE_CATALOG.map((b) => {
    const unlocked = b.check(st);
    return `
      <div class="rounded-2xl border p-4 transition flex items-start gap-3.5 ${
        unlocked
          ? "bg-slate-900 border-freshTeal/60 shadow-lg"
          : "bg-slate-900/50 border-slate-800 opacity-70"
      }">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border ${
          unlocked
            ? "bg-freshTeal/15 border-freshTeal/50"
            : "bg-slate-800 border-slate-700 grayscale"
        }">
          ${b.icon}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <h4 class="font-bold text-sm ${
              unlocked ? "text-warmWhite" : "text-slate-400"
            }">${b.title}</h4>
            <span class="px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
              unlocked
                ? "bg-freshTeal/20 text-freshTeal border border-freshTeal/40"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }">
              ${unlocked ? "✔ Terbuka" : "🔒 Terkunci"}
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-1 leading-relaxed">${b.desc}</p>
        </div>
      </div>
    `;
  }).join("");

  sec.innerHTML = `
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-wrap justify-between items-center gap-3">
      <div>
        <h2 class="text-lg font-extrabold text-goldenYellow">🏆 Galeri Lencana Studio</h2>
        <p class="text-xs md:text-sm text-slate-300 mt-0.5">
          Kumpulkan seluruh lencana pencapaian dengan menuntaskan misi studi kasus, mini game, dan kuis evaluasi.
        </p>
      </div>
      <div class="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs md:text-sm font-bold text-freshTeal">
        Terkumpul: ${unlockedCount} / ${totalCount} Lencana
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${cardsHtml}
    </div>
  `;
}

function ensureCertificatePrintStyles() {
  let style = $("cert-a4-landscape-style");
  if (!style) {
    style = document.createElement("style");
    style.id = "cert-a4-landscape-style";
    document.head.appendChild(style);
  }
  style.textContent = `
    @page {
      size: A4 landscape;
      margin: 0mm !important;
    }
    @media print {
      html, body {
        width: 297mm !important;
        height: 210mm !important;
        max-width: 297mm !important;
        max-height: 210mm !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        overflow: hidden !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .cert-print-hide-sibling {
        display: none !important;
      }
      .cert-print-ancestor {
        display: block !important;
        position: static !important;
        width: 297mm !important;
        height: 210mm !important;
        max-width: 297mm !important;
        max-height: 210mm !important;
        margin: 0 !important;
        padding: 0 !important;
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        overflow: hidden !important;
      }
      .cert-print-target {
        position: fixed !important;
        top: 8mm !important;
        left: 8mm !important;
        width: 281mm !important;
        height: 194mm !important;
        max-width: 281mm !important;
        max-height: 194mm !important;
        margin: 0 !important;
        box-shadow: none !important;
        box-sizing: border-box !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        page-break-before: avoid !important;
        page-break-after: avoid !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .cert-print-target * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  `;
}
function findWhiteCertificateCard(certSec) {
  const candidates = Array.from(certSec.querySelectorAll("div")).filter(
    (el) =>
      el.textContent.includes("SERTIFIKAT KOMPETENSI") &&
      (/bg-white|bg-warmWhite|bg-slate-50/i.test(el.className) ||
        window.getComputedStyle(el).backgroundColor === "rgb(255, 255, 255)"),
  );
  return candidates[candidates.length - 1] || candidates[0] || null;
}

function prepareCertificatePrintTree(certCard) {
  document
    .querySelectorAll(".cert-print-hide-sibling, .cert-print-ancestor, .cert-print-target")
    .forEach((el) => {
      el.classList.remove(
        "cert-print-hide-sibling",
        "cert-print-ancestor",
        "cert-print-target",
      );
    });

  if (!certCard) return;
  certCard.classList.add("cert-print-target");

  let curr = certCard;
  while (curr && curr.parentElement && curr !== document.body) {
    const parent = curr.parentElement;
    Array.from(parent.children).forEach((sibling) => {
      if (sibling !== curr) {
        sibling.classList.add("cert-print-hide-sibling");
      }
    });
    if (parent !== document.body) {
      parent.classList.add("cert-print-ancestor");
    }
    curr = parent;
  }
}

function syncSertifikatUI() {
  ensureCertificatePrintStyles();
  const certSec = $("content-sertifikat");
  if (!certSec) return;

  const profile = getStudentProfile();
  const xpVal = `${getRealPlayerXP()} XP`;
  const quizVal = `${getBestQuizScore()} / 100`;
  const dateVal = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const certCard = findWhiteCertificateCard(certSec);
  if (certCard) {
    prepareCertificatePrintTree(certCard);
  }

  const root = certCard || certSec;

  Array.from(root.querySelectorAll("div, span, p")).forEach((el) => {
    if (/^STUDIO\s*SEAL$/i.test(el.textContent.trim())) {
      const sealBox =
        el.parentElement &&
        !el.parentElement.textContent.includes("Guru Pembimbing") &&
        !el.parentElement.textContent.includes("Perwakilan")
          ? el.parentElement
          : el;
      sealBox.remove();
    }
  });

  const byIdName = $("cert-name") || $("sertifikat-nama");
  if (byIdName) {
    byIdName.textContent = profile.name;
  }

  const givenToLabel = Array.from(root.querySelectorAll("p, div, span")).find(
    (el) =>
      el.children.length === 0 &&
      /Sertifikat ini diberikan kepada\s*:/i.test(el.textContent.trim()),
  );

  if (givenToLabel && givenToLabel.parentElement) {
    let nameHolder =
      $("custom-cert-recipient") || givenToLabel.nextElementSibling;

    if (
      !nameHolder ||
      nameHolder.textContent.includes("Total XP") ||
      nameHolder.querySelector("*")
    ) {
      if (!nameHolder || nameHolder.id !== "custom-cert-recipient") {
        nameHolder = document.createElement("div");
        nameHolder.id = "custom-cert-recipient";
        givenToLabel.parentElement.insertBefore(
          nameHolder,
          givenToLabel.nextSibling,
        );
      }
    }

    const subText = [profile.className, profile.school]
      .filter(Boolean)
      .join(" · ");

    nameHolder.className = "my-2 text-center";
    nameHolder.innerHTML = `
      <div class="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-wide border-b-2 border-slate-300 inline-block px-8 pb-1">
        ${profile.name}
      </div>
      ${
        subText
          ? `<div class="text-xs md:text-sm font-semibold text-slate-600 mt-1">${subText}</div>`
          : ""
      }
    `;
  }

  const phaseEl = Array.from(root.querySelectorAll("p, div, span")).find(
    (el) =>
      el.children.length === 0 &&
      /^SMK\s*DKV\s*Fase\s*F/i.test(el.textContent.trim()),
  );

  let descEl = $("custom-cert-statement");
  if (!descEl) {
    descEl = document.createElement("p");
    descEl.id = "custom-cert-statement";
  }
  descEl.className =
    "text-xs md:text-sm text-slate-600 max-w-2xl mx-auto mt-3 px-4 leading-relaxed text-center";
  descEl.textContent =
    "Telah berhasil menyelesaikan seluruh rangkaian pembelajaran interaktif, studi kasus, simulasi produksi, dan evaluasi kompetensi Alur Kerja Produksi Multimedia Praproduksi, Produksi dan Pascaproduksi.";

  if (phaseEl && phaseEl.parentElement) {
    phaseEl.parentElement.insertBefore(descEl, phaseEl.nextSibling);
  } else if (givenToLabel && givenToLabel.parentElement) {
    const anchor = $("custom-cert-recipient") || givenToLabel;
    anchor.parentElement.insertBefore(descEl, anchor.nextSibling);
  }

  const certMetrics = {
    "Total XP": xpVal,
    "Nilai Evaluasi": quizVal,
    "Tanggal Cetak": dateVal,
  };

  Object.entries(certMetrics).forEach(([labelText, valText]) => {
    const lblEl = Array.from(root.querySelectorAll("div, span, p")).find(
      (el) => el.children.length === 0 && el.textContent.trim() === labelText,
    );
    if (!lblEl || !lblEl.parentElement) return;

    const cell = lblEl.parentElement;
    let valEl = Array.from(cell.children).find((c) => c !== lblEl);
    if (!valEl) {
      valEl = document.createElement("div");
      cell.insertBefore(valEl, lblEl);
    }
    valEl.className = "text-sm md:text-base font-extrabold text-slate-900 mb-0.5";
    valEl.textContent = valText;
  });
}

document.addEventListener(
  "click",
  (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (/Cetak Sertifikat/i.test(btn.textContent.trim())) {
      syncSertifikatUI();
    }
  },
  true,
);

window.addEventListener("beforeprint", () => {
  syncSertifikatUI();
});

function syncGamificationProgressUI() {
  if (typeof state === "undefined" || !state) return;

  const misiDone = Math.min(3, getCompletedMissionNumbers().size);
  const kuisVal = getBestQuizScore();
  const rawMg = state.minigames || {};
  const mgDone = Math.min(
    3,
    [1, 2, 3].some((k) => rawMg[k] !== undefined)
      ? [1, 2, 3].filter((k) => !!rawMg[k]).length
      : Object.values(rawMg).filter(Boolean).length,
  );
  const pct = computeOverallPercent();

  const beranda = $("content-beranda");
  if (!beranda) return;

  const heading = Array.from(beranda.querySelectorAll("h2, h3, h4, div, span")).find(
    (el) =>
      el.children.length === 0 &&
      el.textContent.trim() === "Progres Gamifikasi Interaktif",
  );
  if (!heading) return;

  let card = heading.parentElement;
  while (card && card !== beranda && !card.textContent.includes("Mini Game Selesai")) {
    card = card.parentElement;
  }
  if (!card) return;

  const pctEl = Array.from(card.querySelectorAll("span, div, p, b")).find(
    (el) => el.children.length === 0 && /%\s*Selesai/i.test(el.textContent),
  );
  if (pctEl) {
    pctEl.textContent = `${pct}% Selesai`;
  }

  const barTrack = Array.from(card.querySelectorAll("div")).find(
    (el) =>
      el.children.length === 1 &&
      el.firstElementChild.tagName === "DIV" &&
      /rounded-full/.test(el.className),
  );
  const fillEl = barTrack
    ? barTrack.firstElementChild
    : card.querySelector("[class*='bg-gradient-to-r']");

  if (fillEl) {
    fillEl.style.setProperty("width", `${pct}%`, "important");
    fillEl.style.setProperty("max-width", "100%", "important");
  }

  const statLabels = {
    "Total XP": `${getRealPlayerXP()}`,
    "Misi Studi Kasus": `${misiDone} / 3`,
    "Nilai Kuis": `${kuisVal} / 100`,
    "Mini Game Selesai": `${mgDone} / 3`,
  };

  Object.entries(statLabels).forEach(([labelText, newValue]) => {
    const labelEl = Array.from(card.querySelectorAll("div, span, p")).find(
      (el) => el.children.length === 0 && el.textContent.trim() === labelText,
    );
    if (labelEl && labelEl.parentElement) {
      const valEl = Array.from(labelEl.parentElement.children).find(
        (child) => child !== labelEl,
      );
      if (valEl) valEl.textContent = newValue;
    }
  });
}

function syncQuizHeaderDisplay() {
  const kuisSec = $("content-kuis");
  if (!kuisSec) return;
  const best = getBestQuizScore();
  const tries = getQuizAttempts();

  const bestNodes = Array.from(kuisSec.querySelectorAll("div, span, p, b, strong")).filter(
    (el) => {
      const txt = el.textContent.trim();
      return /^Nilai terbaik\s*:/i.test(txt) && txt.length < 40;
    },
  );
  bestNodes.forEach((el) => {
    const hasMatchingChild = Array.from(el.children).some((c) =>
      /^Nilai terbaik\s*:/i.test(c.textContent.trim()),
    );
    if (!hasMatchingChild) {
      el.textContent = `Nilai terbaik: ${best} / 100`;
    }
  });

  const statusNodes = Array.from(kuisSec.querySelectorAll("div, span, p, b, strong")).filter(
    (el) => {
      const txt = el.textContent.trim();
      return /^(Belum dikerjakan|Percobaan\s*:\s*\d+)$/i.test(txt);
    },
  );
  statusNodes.forEach((el) => {
    const hasMatchingChild = Array.from(el.children).some((c) =>
      /^(Belum dikerjakan|Percobaan\s*:\s*\d+)$/i.test(c.textContent.trim()),
    );
    if (!hasMatchingChild) {
      el.textContent = tries > 0 ? `Percobaan: ${tries}` : "Belum dikerjakan";
    }
  });
}

function getQuizCardsAndGrids() {
  const kuisSec = $("content-kuis");
  if (!kuisSec) return [];

  const allLabels = Array.from(kuisSec.querySelectorAll("label")).filter((lbl) =>
    lbl.querySelector('input[type="radio"]'),
  );
  const gridMap = new Map();
  allLabels.forEach((lbl) => {
    const grid = lbl.parentElement;
    if (!grid) return;
    if (!gridMap.has(grid)) gridMap.set(grid, []);
    gridMap.get(grid).push(lbl);
  });

  const items = [];
  gridMap.forEach((labels, optGrid) => {
    const card = optGrid.parentElement;
    if (card && card !== kuisSec) {
      items.push({ card, optGrid, labels });
    }
  });
  return items;
}

function shuffleQuizQuestionsAndOptions() {
  const kuisSec = $("content-kuis");
  if (!kuisSec) return;

  const items = getQuizCardsAndGrids();
  if (items.length === 0) return;

  items.forEach(({ optGrid, labels }) => {
    if (labels.length < 2) return;
    for (let i = labels.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [labels[i], labels[j]] = [labels[j], labels[i]];
    }
    labels.forEach((lbl, idx) => {
      optGrid.appendChild(lbl);
      const span = lbl.querySelector("span");
      if (span) {
        span.textContent = span.textContent.replace(
          /^[A-E]\.\s*/,
          `${"ABCDE"[idx]}. `,
        );
      }
    });
  });

  const listParent = items[0].card.parentElement;
  if (listParent && items.length > 1) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    items.forEach(({ card }, idx) => {
      listParent.appendChild(card);
      const titleEl = Array.from(card.querySelectorAll("h3, h4, p, div, span")).find(
        (el) =>
          !el.closest("label") &&
          !el.querySelector("input") &&
          el.children.length === 0 &&
          /^\d+\.\s+/.test(el.textContent.trim()),
      );
      if (titleEl) {
        titleEl.textContent = titleEl.textContent.replace(
          /^\s*\d+\./,
          `${idx + 1}.`,
        );
      }
    });
  }
}

function isOptionCorrectForCard(card, optLabel, radioInput) {
  const bank = getGlobalQuizBank();
  if (bank && radioInput && radioInput.name) {
    const qIdxMatch = radioInput.name.match(/(\d+)/);
    if (qIdxMatch) {
      const qIdx = Number(qIdxMatch[1]);
      const qObj = bank[qIdx];
      if (qObj) {
        const correctIdx = Array.isArray(qObj)
          ? qObj[2]
          : (qObj.a ?? qObj.answer ?? qObj.correct ?? qObj.kunci);
        if (correctIdx !== undefined && String(radioInput.value) === String(correctIdx)) {
          return true;
        }
      }
    }
  }

  const qTitle = Array.from(card.querySelectorAll("h3, h4, p, div, span"))
    .filter((el) => !el.closest("label") && el.children.length === 0)
    .map((el) => el.textContent.trim())
    .join(" ");
  const optText = optLabel.textContent.trim();

  for (const entry of QUIZ_FALLBACK_KEY) {
    if (entry.q.test(qTitle) && entry.a.test(optText)) {
      return true;
    }
  }
  return false;
}

function getQuizBottomActionButton() {
  const kuisSec = $("content-kuis");
  if (!kuisSec) return null;
  const items = getQuizCardsAndGrids();
  const lastCard = items.length > 0 ? items[items.length - 1].card : null;

  const buttons = Array.from(kuisSec.querySelectorAll("button")).filter(
    (btn) => !btn.closest("details"),
  );
  if (lastCard) {
    const afterQuestions = buttons.filter(
      (btn) =>
        !!(lastCard.compareDocumentPosition(btn) & Node.DOCUMENT_POSITION_FOLLOWING),
    );
    if (afterQuestions.length > 0) return afterQuestions[0];
  }
  return buttons[buttons.length - 1] || null;
}

function evaluateAndSaveQuiz() {
  const kuisSec = $("content-kuis");
  if (!kuisSec || quizSessionLocked) return;

  const items = getQuizCardsAndGrids();
  if (items.length === 0) return;

  let unansweredCount = 0;
  let firstUnansweredCard = null;

  items.forEach(({ card }) => {
    card.classList.remove("ring-2", "ring-coralOrange");
    const checked = card.querySelector('input[type="radio"]:checked');
    if (!checked) {
      unansweredCount++;
      if (!firstUnansweredCard) firstUnansweredCard = card;
    }
  });

  if (unansweredCount > 0) {
    if (firstUnansweredCard) {
      firstUnansweredCard.classList.add("ring-2", "ring-coralOrange");
      firstUnansweredCard.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    try {
      playSound("wrong");
    } catch (e) {}
    showToast(
      `Masih ada ${unansweredCount} soal yang belum dijawab. Lengkapi semua terlebih dahulu!`,
      "info",
    );
    return;
  }

  quizSessionLocked = true;
  let correctCount = 0;

  items.forEach(({ card, labels }) => {
    const selectedRadio = card.querySelector('input[type="radio"]:checked');

    labels.forEach((lbl) => {
      const inp = lbl.querySelector('input[type="radio"]');
      if (inp) inp.disabled = true;
      lbl.classList.add("pointer-events-none");

      const isRight = isOptionCorrectForCard(card, lbl, inp);
      const isChosen = inp && inp === selectedRadio;

      if (isRight) {
        lbl.classList.remove("border-slate-700", "border-slate-800");
        lbl.classList.add("border-freshTeal", "bg-freshTeal/15");
        if (isChosen) correctCount++;
      } else if (isChosen) {
        lbl.classList.remove("border-slate-700", "border-slate-800");
        lbl.classList.add("border-coralOrange", "bg-coralOrange/15");
      }
    });
  });

  const score = Math.round((correctCount / items.length) * 100);
  const newBest = Math.max(getBestQuizScore(), score);
  const nextAttempts = getQuizAttempts() + 1;

  setBestQuizScore(newBest, false);
  setQuizAttempts(nextAttempts);

  if (score >= 70 && state && !state.quizPassed) {
    state.quizPassed = true;
    try {
      if (typeof addXP === "function") addXP(50);
    } catch (e) {}
  }

  persistStateSafely();
  syncQuizHeaderDisplay();
  syncGamificationProgressUI();
  renderGaleriLencana();
  syncSertifikatUI();
  try {
    if (typeof updateUI === "function") updateUI();
  } catch (e) {}
  removeHeaderProducerBox();
  syncQuizHeaderDisplay();

  const bottomBtn = getQuizBottomActionButton();
  const actionContainer = bottomBtn ? bottomBtn.parentElement : kuisSec;

  let resultBox = $("custom-quiz-result-box");
  if (!resultBox) {
    resultBox = document.createElement("div");
    resultBox.id = "custom-quiz-result-box";
  }
  actionContainer.insertBefore(resultBox, bottomBtn || null);

  const allCorrect = score === 100;
  resultBox.className = `w-full mb-3 p-4 rounded-xl border ${
    allCorrect
      ? "bg-freshTeal/15 border-freshTeal text-warmWhite"
      : "bg-slate-900 border-slate-700 text-warmWhite"
  }`;
  resultBox.innerHTML = `
    <div class="flex flex-wrap justify-between items-center gap-2">
      <div>
        <p class="text-sm font-bold ${allCorrect ? "text-freshTeal" : "text-goldenYellow"}">
          ${allCorrect ? "🎉 Sempurna! Semua jawaban benar." : "📊 Hasil Percobaan Kuis Evaluasi"}
        </p>
        <p class="text-xs text-slate-300 mt-1">
          Skor Percobaan Ini: <b class="text-warmWhite">${score} / 100</b> (${correctCount} dari ${items.length} soal benar) ·
          Nilai Terbaik Tersimpan: <b class="text-freshTeal">${newBest} / 100</b>
        </p>
      </div>
    </div>
  `;

  Array.from(kuisSec.querySelectorAll("button"))
    .filter((btn) => !btn.closest("details"))
    .forEach((btn) => {
      if (btn === bottomBtn) {
        btn.disabled = false;
        btn.className =
          "w-full py-3 px-4 rounded-xl bg-cyanAccent text-midnight font-extrabold text-sm hover:brightness-110 transition cursor-pointer";
        btn.textContent = "↻ Mulai Ulang (Soal Diacak)";
        btn.onclick = function (e) {
          e.preventDefault();
          e.stopPropagation();
          restartShuffledQuiz(false);
        };
      } else {
        btn.remove();
      }
    });

  if (allCorrect) {
    try {
      confetti();
    } catch (e) {}
    showToast(`Luar biasa! Nilai 100/100 tersimpan ke progres.`, "success");
  } else {
    try {
      playSound(score >= 70 ? "correct" : "wrong");
    } catch (e) {}
    showToast(
      `Skor ${score}/100 tersimpan! Tekan "Mulai Ulang (Soal Diacak)" untuk mencoba lagi.`,
      "info",
    );
  }
}

function restartShuffledQuiz(silent = false) {
  quizSessionLocked = false;
  const kuisSec = $("content-kuis");
  if (!kuisSec) return;

  const resultBox = $("custom-quiz-result-box");
  if (resultBox) resultBox.remove();

  const items = getQuizCardsAndGrids();
  items.forEach(({ card, labels }) => {
    card.classList.remove("ring-2", "ring-coralOrange");
    labels.forEach((lbl) => {
      const inp = lbl.querySelector('input[type="radio"]');
      if (inp) {
        inp.checked = false;
        inp.disabled = false;
      }
      lbl.classList.remove(
        "pointer-events-none",
        "opacity-90",
        "border-freshTeal",
        "border-coralOrange",
        "bg-freshTeal/15",
        "bg-coralOrange/15",
      );
      lbl.classList.add("border-slate-800");
    });
  });

  shuffleQuizQuestionsAndOptions();
  syncQuizHeaderDisplay();

  const bottomBtn = getQuizBottomActionButton();
  if (bottomBtn) {
    bottomBtn.disabled = false;
    bottomBtn.className =
      "px-5 py-3 rounded-xl bg-freshTeal text-midnight font-extrabold text-sm hover:brightness-110 transition cursor-pointer";
    bottomBtn.textContent = "📊 Hitung & Simpan Nilai Kuis";
    bottomBtn.onclick = null;
  }

  if (!silent) {
    kuisSec.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      playTone(560, "sine", 0.1);
    } catch (e) {}
  }
}

function performInstantFullReset() {
  if (typeof stopGames === "function") {
    try {
      stopGames();
    } catch (e) {}
  }

  const profile = getStudentProfile();
  const savedPlayer = {
    name: profile.name !== "Peserta DKV" ? profile.name : "",
    school: profile.school || "",
    className: profile.className || "",
    role: "Produser",
    avatar: state?.player?.avatar || "🎬",
    xp: 0,
    level: 1,
  };

  if (typeof DEFAULT_STATE !== "undefined" && typeof clone === "function") {
    state = clone(DEFAULT_STATE);
  } else {
    state = {};
  }

  state.player = { ...(state.player || {}), ...savedPlayer, xp: 0, level: 1 };
  state.xp = 0;
  state.level = 1;
  state.doneMisiNums = [];
  state.misi = {};
  state.missions = {};
  state.cases = {};
  state.studiKasus = {};
  state.minigames = {};
  state.visited = {};
  state.quizPassed = false;
  state.catcherHigh = 0;
  state.bestCatcher = 0;
  state.catcherPlays = 0;
  state.catcherLastScore = 0;
  setBestQuizScore(0, true);
  setQuizAttempts(0);

  if (typeof stationChecks !== "undefined") {
    stationChecks = { client: {}, pra: {}, prod: {}, pasca: {} };
  }
  if (typeof slotPlaced !== "undefined") {
    slotPlaced = { pra: [], prod: [], pasca: [] };
  }

  persistStateSafely();
  resetMisiDOMElements();

  restartShuffledQuiz(true);
  syncMisiStatusUI();
  syncQuizHeaderDisplay();
  syncGamificationProgressUI();
  renderGaleriLencana();
  syncSertifikatUI();
  removeHeaderProducerBox();
  if (typeof renderMiniGameTabs === "function") renderMiniGameTabs();
  if (typeof renderMainNavTabs === "function") renderMainNavTabs();
  if (typeof updateCatcherHUD === "function") {
    try {
      updateCatcherHUD();
    } catch (e) {}
  }

  try {
    if (typeof updateUI === "function") updateUI();
  } catch (e) {}

  removeHeaderProducerBox();
  resetMisiDOMElements();
  syncMisiStatusUI();
  syncQuizHeaderDisplay();
  syncGamificationProgressUI();
  renderGaleriLencana();
  syncSertifikatUI();
}

document.addEventListener(
  "click",
  (e) => {
    const clickable = e.target.closest("button, a, span, div");
    if (!clickable) return;

    const text = clickable.textContent.trim();
    const beranda = $("content-beranda");
    const modal = $("modal");

    const isConfirmDeleteInBeranda =
      beranda &&
      beranda.contains(clickable) &&
      /^Ya,\s*hapus$/i.test(text);

    const isConfirmDeleteInModal =
      modal &&
      !modal.classList.contains("hidden") &&
      modal.contains(clickable) &&
      /^(Ya,\s*hapus|Reset|Hapus)$/i.test(text);

    if (isConfirmDeleteInBeranda || isConfirmDeleteInModal) {
      setTimeout(() => {
        performInstantFullReset();
        showToast("Seluruh data progres, misi, & percobaan berhasil dihapus!", "info");
      }, 30);
    }
  },
  true,
);

document.addEventListener(
  "click",
  (e) => {
    const misiSec = $("content-misi");
    if (!misiSec || !misiSec.contains(e.target)) return;

    const btn = e.target.closest("button");
    if (!btn) return;

    const match = btn.textContent.trim().match(/Kirim Keputusan Misi\s*(\d+)/i);
    if (match) {
      const mNum = Number(match[1]);
      setTimeout(() => {
        const card = findMissionCardElement(mNum);
        if (card && /Keputusan tepat/i.test(card.textContent)) {
          markMissionCompletedInState(mNum);
          persistStateSafely();
        }
        syncMisiStatusUI();
        syncGamificationProgressUI();
        renderGaleriLencana();
        syncSertifikatUI();
      }, 45);
    }
  },
  true,
);

document.addEventListener(
  "click",
  (e) => {
    const kuisSec = $("content-kuis");
    if (!kuisSec || !kuisSec.contains(e.target)) return;

    const btn = e.target.closest("button");
    if (!btn || btn.closest("details")) return;

    const label = btn.textContent.trim();
    if (/Mulai Ulang \(Soal Diacak\)/i.test(label)) {
      e.preventDefault();
      e.stopPropagation();
      restartShuffledQuiz(false);
      return;
    }

    if (
      /Hitung|Simpan Nilai|Periksa|Selesai|Kumpulkan|Submit|Cek Jawaban/i.test(
        label,
      )
    ) {
      e.preventDefault();
      e.stopPropagation();
      evaluateAndSaveQuiz();
    }
  },
  true,
);

const _prevSwitchTabForQuiz = switchTab;
switchTab = function (t) {
  _prevSwitchTabForQuiz(t);
  removeHeaderProducerBox();
  if (t === "kuis") {
    syncQuizHeaderDisplay();
    if (!quizSessionLocked) {
      shuffleQuizQuestionsAndOptions();
    }
  } else if (t === "lencana") {
    renderGaleriLencana();
  } else if (t === "misi") {
    syncMisiStatusUI();
  } else if (t === "sertifikat") {
    syncSertifikatUI();
  }
  syncGamificationProgressUI();
};

if (typeof updateUI === "function") {
  const _origUpdateUI = updateUI;
  updateUI = function () {
    try {
      _origUpdateUI.apply(this, arguments);
    } catch (e) {}
    removeHeaderProducerBox();
    syncMisiStatusUI();
    syncQuizHeaderDisplay();
    syncGamificationProgressUI();
    renderGaleriLencana();
    syncSertifikatUI();
  };
}

if (typeof saveState === "function") {
  const _origSaveState = saveState;
  saveState = function () {
    try {
      _origSaveState.apply(this, arguments);
    } catch (e) {}
    persistStateSafely();
    removeHeaderProducerBox();
    syncMisiStatusUI();
    syncQuizHeaderDisplay();
    syncGamificationProgressUI();
    renderGaleriLencana();
    syncSertifikatUI();
  };
}

const TEAM_CREDITS_DATA = {
  group: "Kelompok 9",
  members: [
    { name: "Radiet Febrian S", npm: "2513025006", initial: "RF" },
    { name: "Larasati", npm: "2513025028", initial: "LR" },
    { name: "Tyas Syafa Pratiwi", npm: "2513025042", initial: "TS" },
    { name: "Mawaddatul Fadilah", npm: "2513025072", initial: "MF" },
  ],
};

function renderTeamCredits() {
  const tentangSec =
    $("content-tentang") ||
    $("content-rubrik") ||
    Array.from(document.querySelectorAll(".tab-content, section")).find((el) =>
      /Tentang\s*(&|dan)\s*Rubrik|Rubrik Penilaian/i.test(el.textContent),
    );

  if (tentangSec && !$("custom-team-credits")) {
    const creditCard = document.createElement("div");
    creditCard.id = "custom-team-credits";
    creditCard.className =
      "bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-4";

    const membersHtml = TEAM_CREDITS_DATA.members
      .map(
        (m) => `
        <div class="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/80 hover:border-cyanAccent/50 transition">
          <div class="w-10 h-10 rounded-xl bg-cyanAccent/15 border border-cyanAccent/40 text-cyanAccent font-extrabold text-xs flex items-center justify-center shrink-0">
            ${m.initial}
          </div>
          <div class="min-w-0">
            <div class="font-bold text-sm text-warmWhite truncate">${m.name}</div>
            <div class="text-xs text-slate-400 font-mono mt-0.5">NPM: ${m.npm}</div>
          </div>
        </div>
      `,
      )
      .join("");

    creditCard.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h3 class="text-base md:text-lg font-extrabold text-goldenYellow">
            👥 Tim Pengembang Media Pembelajaran
          </h3>
          <p class="text-xs text-slate-400 mt-0.5">
            Perancang & Pengembang Aplikasi Creative Digital Studio Adventure
          </p>
        </div>
        <span class="px-3 py-1 rounded-full text-xs font-extrabold bg-goldenYellow/15 border border-goldenYellow/40 text-goldenYellow">
          ${TEAM_CREDITS_DATA.group}
        </span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        ${membersHtml}
      </div>
    `;

    tentangSec.appendChild(creditCard);
  }

  const footerEl = document.querySelector("footer");
  if (footerEl && !footerEl.dataset.creditAdded) {
    footerEl.dataset.creditAdded = "1";
    const baseText = footerEl.textContent.trim().replace(/\.$/, "");
    footerEl.innerHTML = `
      <span>${baseText}</span>
      <span class="mx-1.5 text-slate-600">•</span>
      <span class="text-slate-300 font-semibold">Dikembangkan oleh ${TEAM_CREDITS_DATA.group}</span>
    `;
  }
}

function ensureHiddenProyekPlaceholder() {
  let proyekSec = $("content-proyek");
  if (!proyekSec) {
    const beranda = $("content-beranda");
    const parent = beranda
      ? beranda.parentElement
      : document.querySelector("main") || document.body;
    proyekSec = document.createElement("section");
    proyekSec.id = "content-proyek";
    parent.appendChild(proyekSec);
  }
  proyekSec.classList.add("hidden");
  proyekSec.style.setProperty("display", "none", "important");
}

function removeTugasProyekFeature() {
  ensureHiddenProyekPlaceholder();

  Array.from(document.querySelectorAll("button, a")).forEach((el) => {
    const txt = el.textContent.trim();
    const onclickAttr = el.getAttribute("onclick") || "";
    const isProyekTarget =
      /Tugas Proyek/i.test(txt) || /switchTab\(['"]proyek['"]\)/i.test(onclickAttr);

    if (!isProyekTarget) return;

    if (/Lanjut/i.test(txt)) {
      el.textContent = txt.replace(/Tugas Proyek/i, "Jurnal Refleksi");
      el.setAttribute("onclick", "switchTab('refleksi')");
      el.onclick = function (e) {
        e.preventDefault();
        if (typeof switchTab === "function") switchTab("refleksi");
      };
      return;
    }

    const beranda = $("content-beranda");
    if (beranda && beranda.contains(el) && el.closest(".grid")) {
      const card = el.closest(".grid > div, .grid > button");
      if (card) card.remove();
      else el.remove();
    } else {
      el.remove();
    }
  });

  const beranda = $("content-beranda");
  if (beranda) {
    Array.from(beranda.querySelectorAll("li, p, div")).forEach((el) => {
      if (el.children.length > 0 && el.tagName !== "LI") return;
      if (/Tugas Proyek\s*(dan|,)\s*Jurnal Refleksi/i.test(el.innerHTML)) {
        el.innerHTML = el.innerHTML.replace(
          /(?:<b>)?Tugas Proyek(?:<\/b>)?\s*(?:dan|,)\s*/gi,
          "",
        );
      }
    });
  }

  const tentangSec =
    $("content-tentang") ||
    $("content-rubrik") ||
    Array.from(document.querySelectorAll(".tab-content, section")).find((el) =>
      /Tentang\s*(&|dan)\s*Rubrik|Rubrik Penilaian/i.test(el.textContent),
    );

  if (tentangSec) {
    Array.from(tentangSec.querySelectorAll("tr, li")).forEach((row) => {
      if (/Lembar Tugas Proyek|Tugas Proyek Produksi/i.test(row.textContent)) {
        row.remove();
      }
    });

    Array.from(tentangSec.querySelectorAll("p, div, span, td")).forEach((el) => {
      if (el.children.length === 0 && /Tugas Proyek/i.test(el.textContent)) {
        el.textContent = el.textContent
          .replace(/,?\s*Tugas Proyek\s*(dan|,)?\s*/gi, " ")
          .replace(/\s{2,}/g, " ")
          .trim();
      }
    });
  }
}

function recoverQuizAndPagesIfEmpty() {
  ensureHiddenProyekPlaceholder();
  const kuisSec = $("content-kuis");
  const hasQuestions =
    kuisSec && kuisSec.querySelectorAll('input[type="radio"]').length > 0;

  if (!hasQuestions) {
    try {
      if (typeof initPages === "function") initPages();
    } catch (e) {}
    try {
      if (typeof renderKuis === "function") renderKuis();
    } catch (e) {}
    try {
      if (typeof updateUI === "function") updateUI();
    } catch (e) {}
  }

  removeTugasProyekFeature();
  if (typeof removeHeaderProducerBox === "function") removeHeaderProducerBox();
  if (typeof syncMisiStatusUI === "function") syncMisiStatusUI();
  if (typeof syncQuizHeaderDisplay === "function") syncQuizHeaderDisplay();
  if (typeof syncGamificationProgressUI === "function") syncGamificationProgressUI();
  if (typeof renderGaleriLencana === "function") renderGaleriLencana();
  if (typeof renderGlosariumList === "function") renderGlosariumList();
  if (typeof renderTeamCredits === "function") renderTeamCredits();
  if (typeof syncSertifikatUI === "function") syncSertifikatUI();
}

if (typeof switchTab === "function") {
  const _prevSwitchTabNoProyek = switchTab;
  switchTab = function (t) {
    ensureHiddenProyekPlaceholder();
    if (String(t).toLowerCase() === "proyek") {
      _prevSwitchTabNoProyek("refleksi");
      removeTugasProyekFeature();
      return;
    }
    _prevSwitchTabNoProyek(t);
    if (String(t).toLowerCase() === "kuis") {
      recoverQuizAndPagesIfEmpty();
      if (!quizSessionLocked && typeof shuffleQuizQuestionsAndOptions === "function") {
        shuffleQuizQuestionsAndOptions();
      }
    } else {
      removeTugasProyekFeature();
    }
  };
}

if (typeof updateUI === "function") {
  const _origUpdateUINoProyek = updateUI;
  updateUI = function () {
    ensureHiddenProyekPlaceholder();
    try {
      _origUpdateUINoProyek.apply(this, arguments);
    } catch (e) {}
    removeTugasProyekFeature();
  };
}

recoverQuizAndPagesIfEmpty();

if (typeof switchTab === "function") {
  const _prevSwitchTabCredits = switchTab;
  switchTab = function (t) {
    _prevSwitchTabCredits(t);
    renderTeamCredits();
  };
}

renderTeamCredits();
removeHeaderProducerBox();
getStudentProfile();
syncMisiStatusUI();
renderGaleriLencana();
syncQuizHeaderDisplay();
syncGamificationProgressUI();
syncSertifikatUI();
renderMainNavTabs();
renderMiniGameTabs();
switchTab("beranda");
initPages();
applySettings();
renderGlossary();
storageCheck();
updateUI();
renderWelcomeScreen();
switchTab("beranda");
