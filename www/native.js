/* ============= Native glue for সংকল্প OS (Capacitor Android + iOS). =============
   Everything is guarded so the same www/ folder still runs in a plain browser. */
(function () {
  var Cap = window.Capacitor;
  if (!Cap || !Cap.isNativePlatform || !Cap.isNativePlatform()) return;
  var P = Cap.Plugins || {};
  if (P.SplashScreen) {
    setTimeout(function () { P.SplashScreen.hide(); }, 300);
  }
  function syncStatusBar() {
    if (!P.StatusBar) return;
    var dark = document.documentElement.classList.contains("dark");
    var isIOS = Cap.getPlatform && Cap.getPlatform() === "ios";
    if (isIOS) {
      P.StatusBar.setStyle({ style: dark ? "DARK" : "LIGHT" }).catch(function () {});
    } else {
      P.StatusBar.setBackgroundColor({ color: dark ? "#0b0f0e" : "#eef7f2" }).catch(function () {});
      P.StatusBar.setStyle({ style: dark ? "DARK" : "LIGHT" }).catch(function () {});
    }
  }
  syncStatusBar();
  new MutationObserver(syncStatusBar).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  if (P.App) {
    P.App.addListener("backButton", function () {
      var esc = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
      var overlay = document.querySelector("[data-native-overlay], [role='dialog']");
      if (overlay) { document.dispatchEvent(esc); return; }
      if (window.history.length > 1 && location.hash) { window.history.back(); return; }
      if (window.confirm("অ্যাপ বন্ধ করতে চান?")) P.App.exitApp();
    });
    P.App.addListener("appStateChange", function (s) {
      if (!s.isActive) window.dispatchEvent(new Event("app-persist"));
      else if (typeof syncCute === "function") setTimeout(syncCute, 600);
    });
  }
  if (P.Haptics) {
    document.addEventListener("click", function (e) {
      if (e.target.closest("button, [role='button'], a")) {
        P.Haptics.impact({ style: "LIGHT" }).catch(function () {});
      }
    }, true);
  }
  var LN = P.LocalNotifications;
  function hashId(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    return Math.abs(h % 2000000000) + 1;
  }
  function hm(t) {
    var m = /^(\d{1,2}):(\d{2})/.exec(t || "");
    return m ? { hour: +m[1], minute: +m[2] } : null;
  }
  var permAsked = false;
  function ensurePerms() {
    if (!LN) return Promise.resolve(false);
    return LN.checkPermissions().then(function (r) {
      if (r.display === "granted") return true;
      if (permAsked) return false;
      permAsked = true;
      return LN.requestPermissions().then(function (x) { return x.display === "granted"; });
    }).then(function (ok) {
      if (ok && LN.checkExactNotificationSetting) {
        LN.checkExactNotificationSetting().then(function (e) {
          if (e.exact_alarm !== "granted" && !localStorage.getItem("exact-asked")) {
            localStorage.setItem("exact-asked", "1");
            if (window.confirm("সঠিক সময়ে অ্যালার্ম বাজাতে 'Alarms & reminders' অনুমতি চালু করুন।")) LN.changeExactNotificationSetting();
          }
        }).catch(function () {});
      }
      return ok;
    }).catch(function () { return false; });
  }
  if (LN) {
    LN.createChannel({ id: "alarms", name: "Alarms", description: "Alarm clock", importance: 5, visibility: 1, vibration: true, sound: "default" }).catch(function () {});
    LN.createChannel({ id: "reminders", name: "Reminders", description: "Task & schedule reminders", importance: 4, visibility: 1, vibration: true }).catch(function () {});
    LN.createChannel({ id: "cute", name: "Cute nudges", description: "মিষ্টি মিষ্টি উৎসাহ", importance: 3, visibility: 1, sound: "default" }).catch(function () {});
    ensurePerms();
  }
  var LINES = ["এখনই কাজটা শুরু করো 💪", "সময় হয়ে গেছে! ✨", "আজকের সংকল্প পূরণ করো 🎯"];
  function buildList(state) {
    var out = [];
    var now = Date.now();
    (state.alarms || []).forEach(function (a) {
      if (!a.active) return;
      var t = hm(a.time); if (!t) return;
      var days = a.days && a.days.length ? a.days : null;
      var base = { title: "⏰ " + (a.label || "Alarm"), body: a.time + " — " + (a.label || "অ্যালার্ম"), channelId: "alarms", extra: { kind: "alarm", id: a.id } };
      if (days) days.forEach(function (d) {
        out.push(Object.assign({ id: hashId("alarm:" + a.id + ":" + d), schedule: { on: { weekday: d + 1, hour: t.hour, minute: t.minute }, allowWhileIdle: true } }, base));
      });
      else out.push(Object.assign({ id: hashId("alarm:" + a.id), schedule: { on: { hour: t.hour, minute: t.minute }, allowWhileIdle: true } }, base));
    });
    (state.schedule || []).forEach(function (s) {
      var t = hm(s.time); if (!t) return;
      var base = { title: "📅 " + (s.title || "Schedule"), body: LINES[0], channelId: "reminders", extra: { kind: "schedule", id: s.id } };
      if (s.day != null) out.push(Object.assign({ id: hashId("sched:" + s.id), schedule: { on: { weekday: +s.day + 1, hour: t.hour, minute: t.minute }, allowWhileIdle: true } }, base));
      else if (s.date) {
        var at = new Date(s.date + "T" + s.time);
        if (at.getTime() > now) out.push(Object.assign({ id: hashId("sched:" + s.id), schedule: { at: at, allowWhileIdle: true } }, base));
      }
    });
    (state.todos || []).forEach(function (td) {
      if (td.done || !td.due || !td.time) return;
      var at = new Date(td.due + "T" + td.time);
      if (isNaN(at) || at.getTime() <= now) return;
      out.push({ id: hashId("todo:" + td.id), title: "✅ " + (td.title || "Task"), body: LINES[1], channelId: "reminders", schedule: { at: at, allowWhileIdle: true }, extra: { kind: "todo", id: td.id } });
    });
    return out.slice(0, 60);
  }
  var syncTimer = null, lastSig = "";
  function syncAlarms(state) {
    if (!LN || !state) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () {
      var list = buildList(state);
      var sig = JSON.stringify(list);
      if (sig === lastSig) return;
      lastSig = sig;
      ensurePerms().then(function (ok) {
        if (!ok) return;
        return LN.getPending().then(function (p) {
          var cancel = (p.notifications || []).map(function (n) { return { id: n.id }; });
          return cancel.length ? LN.cancel({ notifications: cancel }) : null;
        }).then(function () {
          if (list.length) return LN.schedule({ notifications: list });
        });
      }).catch(function (e) { console.warn("alarm sync failed", e); });
    }, 800);
  }
  try {
    var raw = localStorage.getItem("focus-vault-v1");
    if (raw) setTimeout(function () { syncAlarms(JSON.parse(raw)); }, 1500);
  } catch (e) {}
  var CUTE_LINES = [
    "একটা পরীক্ষা দিয়ে ফেলুন না 🥺 আজকে পরীক্ষা দিবেন না?",
    "আজকে পরীক্ষা না দিলে কিন্তু রাগ করবো 😤 ভালোবাসা থেকে বলছি 💚",
    "এইজে আমার কথা কি মনে আছে, নাকি ভুলে গেছেন? 🥺",
    "মাত্র ১০টা MCQ! পরীক্ষা দিয়ে ফেলুন না, প্লিজ প্লিজ 🥺👉👈",
    "স্ট্রিক ভাঙবে না তো? 😰 আমি রোজ হিসাব করে যাচ্ছি ✋",
    "একটু পড়ার টেবিলে বসে যান না 📚 আমি ওপাশে দাঁড়িয়ে আছি ✨",
    "আজকের সংকল্পটা মনে আছে তো? 🔥 আমি কিন্তু খেয়াল রাখছি 👀",
    "ফ্ল্যাশকার্ডগুলো তোমাকে মিস করছে 🃏 একটা ছোট্ট রিভিশন দিয়ে আসেন?",
    "ছোট্ট একটা টাইমার চালু করেন 🍅 ২৫ মিনিট পরে আমি হাততালি দেবো 👏",
    "আজ কেমন লাগছে? ভালো না লাগলেও পড়া ছাড়বেন না তো 🤍",
    "এক কাপ চা ☕ আর এক পাতা নোট — আজকের প্ল্যান রেডি?",
    "আমি রোজ পাখির মতো ডেকে ওঠি 🐦 আর আপনি রোজ একটু পড়েন 📖",
    "মনে আছে? আজ যা পড়বেন, কাল সেটাই কাজে লাগবে 💪",
    "লেভেল আপ করার সময় হয়েছে 🎮 আজকের XP টা ছাড়া যাবেন না তো?"
  ];
  var CUTE_HOUR = 21, CUTE_MIN = 0, CUTE_DAYS = 7;
  var CUTE_IDS_KEY = "cute-notif-ids";
  function syncCute() {
    if (!LN) return;
    ensurePerms().then(function (ok) {
      if (!ok) return;
      var old = [];
      try { old = JSON.parse(localStorage.getItem(CUTE_IDS_KEY) || "[]"); } catch (e) {}
      var prep = old.length ? LN.cancel({ notifications: old.map(function (id) { return { id: id }; }) }) : Promise.resolve();
      return prep.then(function () {
        var now = new Date();
        var list = [];
        for (var i = 0; i < CUTE_DAYS; i++) {
          var day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
          if (i === 0 && (now.getHours() > CUTE_HOUR || (now.getHours() === CUTE_HOUR && now.getMinutes() >= CUTE_MIN))) continue;
          var dayKey = Math.floor(day.getTime() / 86400000);
          var line = CUTE_LINES[dayKey % CUTE_LINES.length];
          list.push({
            id: hashId("cute:" + day.toDateString()),
            title: "সংকল্প OS 💚",
            body: line,
            channelId: "cute",
            schedule: {
              on: { year: day.getFullYear(), month: day.getMonth() + 1, day: day.getDate(), hour: CUTE_HOUR, minute: CUTE_MIN },
              allowWhileIdle: true
            },
            extra: { kind: "cute" }
          });
        }
        try { localStorage.setItem(CUTE_IDS_KEY, JSON.stringify(list.map(function (n) { return n.id; }))); } catch (e) {}
        if (list.length) return LN.schedule({ notifications: list });
      });
    }).catch(function (e) { console.warn("cute sync failed", e); });
  }
  setTimeout(syncCute, 2500);
  function exportFile(name, data) {
    var FS = P.Filesystem;
    if (!FS) return Promise.reject(new Error("Filesystem unavailable"));
    var path = "Sonkolpo/" + name;
    var perm = FS.requestPermissions ? FS.requestPermissions().catch(function () {}) : Promise.resolve();
    return perm.then(function () {
      return FS.writeFile({ path: path, data: data, directory: "DOCUMENTS", encoding: "utf8", recursive: true });
    }).then(function (res) {
      if (P.Share) P.Share.share({ title: name, url: res.uri, dialogTitle: "Backup সেভ / শেয়ার" }).catch(function () {});
      return "Documents/" + path;
    }, function () {
      return FS.writeFile({ path: name, data: data, directory: "CACHE", encoding: "utf8" }).then(function (res) {
        if (P.Share) return P.Share.share({ title: name, url: res.uri, dialogTitle: "Backup সেভ করুন" }).then(function () { return "shared"; });
        return "cache";
      });
    });
  }
  window.NativeBridge = {
    syncAlarms: syncAlarms,
    syncCute: syncCute,
    exportFile: exportFile,
    share: function (title, text) {
      return P.Share ? P.Share.share({ title: title, text: text, dialogTitle: title }) : Promise.resolve();
    },
  };
})();
