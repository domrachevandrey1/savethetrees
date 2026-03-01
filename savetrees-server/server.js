const express    = require("express");
const cors       = require("cors");
const crypto     = require("crypto");
require("dotenv").config();

const app  = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Отдаём статические файлы (html, css, js, картинки) ──────
app.use(express.static("public"));

// ── 1. СОЗДАНИЕ ССЫЛКИ НА ОПЛАТУ ────────────────────────────
// Фронтенд вызывает этот эндпоинт когда пользователь нажал "Далее"
app.post("/create-payment", (req, res) => {
  const { trees } = req.body;

  if (!trees || trees < 1) {
    return res.status(400).json({ error: "Неверное количество деревьев" });
  }

  const amount   = trees * 40;           // 40 рублей за дерево
  const label    = `trees_${trees}_${Date.now()}`; // уникальная метка платежа
  const receiver = process.env.YOOMONEY_WALLET;     // номер кошелька из .env

  // Формируем ссылку на форму быстрой оплаты ЮMoney
  const params = new URLSearchParams({
    receiver:     receiver,
    "quickpay-form": "button",
    paymentType:  "AC",           // AC = банковская карта, PC = кошелёк ЮMoney
    sum:          amount,
    label:        label,
    successURL:   `${process.env.SITE_URL}/success.html`,
    targets:      `Посадка ${trees} деревьев`,
  });

  const paymentURL = `https://yoomoney.ru/quickpay/confirm.xml?${params}`;

  res.json({ url: paymentURL, label, amount });
});

// ── 2. WEBHOOK — ЮMoney сюда сообщает об успешной оплате ────
app.post("/webhook", (req, res) => {
  const {
    notification_type,
    operation_id,
    amount,
    currency,
    datetime,
    sender,
    codepro,
    label,
    sha1_hash,
  } = req.body;

  // Проверяем подпись — чтобы никто не подделал уведомление
  const secret    = process.env.YOOMONEY_SECRET;
  const str       = [
    notification_type, operation_id, amount, currency,
    datetime, sender, codepro, secret, label
  ].join("&");

  const hash = crypto.createHash("sha1").update(str).digest("hex");

  if (hash !== sha1_hash) {
    console.log("❌ Неверная подпись webhook!");
    return res.status(400).send("Bad signature");
  }

  // Подпись верна — платёж настоящий
  // Достаём количество деревьев из метки: "trees_50_1234567890"
  const trees = parseInt(label.split("_")[1]);

  if (!isNaN(trees) && trees > 0) {
    console.log(`✅ Оплата подтверждена! Добавляем ${trees} деревьев`);
    // Обновляем счётчик в Firebase через Admin SDK
    updateFirebaseCounter(trees);
  }

  res.status(200).send("OK");
});

// ── 3. ОБНОВЛЕНИЕ СЧЁТЧИКА В FIREBASE ───────────────────────
const { initializeApp, cert } = require("firebase-admin/app");
const { getDatabase }         = require("firebase-admin/database");

const firebaseAdmin = initializeApp({
  credential: cert({
    projectId:    process.env.FIREBASE_PROJECT_ID,
    clientEmail:  process.env.FIREBASE_CLIENT_EMAIL,
    privateKey:   process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = getDatabase(firebaseAdmin);

async function updateFirebaseCounter(trees) {
  const ref = db.ref("trees_total");
  await ref.transaction((current) => (current ?? 0) + trees);
  console.log(`🌳 Firebase обновлён: +${trees} деревьев`);
}

// ── 4. ЗАПУСК СЕРВЕРА ────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
});
