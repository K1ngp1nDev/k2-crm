# K2 ERP — Модуль обліку замовлень

Невеликий, але «по-дорослому» зроблений модуль обліку замовлень: **Python / Flask
REST API** + **React + TypeScript SPA** з акуратним UI/UX.

Сутності: **Клієнт → Замовлення → Позиція замовлення → Товар**. Сума замовлення
рахується **на сервері**, ціна товару **фіксується** в позиції на момент
замовлення (snapshot) — як у справжніх облікових системах.

---

## Зміст
- [Можливості](#можливості)
- [Стек](#стек)
- [Архітектура](#архітектура)
- [Структура проєкту](#структура-проєкту)
- [Швидкий старт](#швидкий-старт)
- [База даних](#база-даних-sqlite--postgresql)
- [API](#api)
- [Бізнес-правила](#бізнес-правила)
- [Тести](#тести)
- [Чому саме такий підхід](#чому-саме-такий-підхід)

---

## Можливості
- Створення клієнтів, товарів, замовлень.
- Список замовлень по клієнту.
- Автоматичний розрахунок суми замовлення на сервері.
- Дашборд із показниками (клієнти, товари, замовлення, виторг).
- Конструктор замовлення з live-підрахунком суми та sticky-підсумком.
- Світла / темна тема, toast-сповіщення, empty-states, адаптивність.

## Стек
| Шар | Технології |
|---|---|
| Backend | Python 3.12, Flask, Flask-SQLAlchemy (SQLAlchemy 2.0), Pydantic v2 |
| БД | SQLite (за замовчуванням) / PostgreSQL (через `DATABASE_URL`) |
| Frontend | React 18, TypeScript, Vite |
| Тести | pytest (backend), Vitest + Testing Library (frontend) |
| DevOps | Docker (multi-stage), docker-compose, gunicorn |

## Архітектура

```
React + TS (Vite SPA)
        │  fetch /api/*  (типізований клієнт)
        ▼
Flask (app-factory)
  routes  ──►  schemas (Pydantic: валідація + серіалізація)
     │
     ▼
  services (бізнес-правила + транзакції)
     │
     ▼
  models (SQLAlchemy 2.0)  ──►  SQLite | PostgreSQL
```

Шари розділені навмисно: контролери тонкі, уся доменна логіка — в `services`,
що робить її легко тестованою й придатною для повторного використання.

## Структура проєкту

```
k2-erp-orders/
├── app/                  # Backend
│   ├── __init__.py       # create_app(): фабрика, БД, error handlers, віддача SPA
│   ├── config.py         # конфіг з env (DATABASE_URL)
│   ├── extensions.py     # db = SQLAlchemy()
│   ├── models.py         # Client, Product, Order, OrderItem
│   ├── schemas.py        # Pydantic: *Create / *Out
│   ├── services.py       # бізнес-логіка + транзакції
│   ├── errors.py         # доменні помилки + єдиний формат JSON-помилки
│   └── routes.py         # /api endpoints
├── tests/                # pytest (бізнес-правила)
├── frontend/             # React + TypeScript (Vite)
│   └── src/
│       ├── api/          # типізований клієнт + типи
│       ├── components/   # дизайн-система (Button, Card, Field, Toast, ...)
│       ├── views/        # Dashboard / Clients / Products / Orders
│       └── styles.css    # дизайн-токени + теми
├── run.py                # точка входу (run:app для gunicorn)
├── requirements.txt
├── Dockerfile            # multi-stage: build SPA → backend + bundled SPA
└── docker-compose.yml    # app (+ опційний postgres профіль)
```

## Швидкий старт

### Варіант A — Docker (один контейнер: API + SPA)

```bash
docker compose up --build
# відкрити http://localhost:5000
```

### Варіант B — локально

**Backend:**
```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python run.py          # http://localhost:5000  (API; SPA — якщо є frontend/dist)
```

**Frontend (dev, з hot-reload і проксі на API):**
```bash
cd frontend
npm install
npm run dev            # http://localhost:5173  (проксує /api → :5000)
```

Для продакшн-білду фронта: `cd frontend && npm run build` — і Flask віддаватиме
SPA із `frontend/dist` на `http://localhost:5000`.

## База даних (SQLite / PostgreSQL)

Підключення керується змінною `DATABASE_URL` — код не змінюється:

```bash
# SQLite (за замовчуванням)
export DATABASE_URL="sqlite:///k2_erp.db"

# PostgreSQL
export DATABASE_URL="postgresql+psycopg://k2:k2@localhost:5432/k2_erp"
```

Підняти Postgres через compose: `docker compose --profile postgres up`.
Схема створюється автоматично при старті (`db.create_all()`).

## API

Базовий префікс — `/api`. Формат помилки уніфікований:
`{"error": {"code": "...", "message": "...", "details": [...]}}`.

| Метод | Шлях | Опис |
|---|---|---|
| GET | `/api/health` | healthcheck |
| GET | `/api/stats` | агреговані показники |
| POST | `/api/clients` | створити клієнта |
| GET | `/api/clients` | список клієнтів |
| POST | `/api/products` | створити товар |
| GET | `/api/products` | список товарів |
| POST | `/api/orders` | створити замовлення (валідація + розрахунок) |
| GET | `/api/orders` | усі замовлення (опц. `?client_id=`) |
| GET | `/api/orders/<id>` | одне замовлення |
| GET | `/api/clients/<id>/orders` | замовлення клієнта |

### Приклади

```bash
# Клієнт
curl -X POST localhost:5000/api/clients \
  -H 'Content-Type: application/json' \
  -d '{"name":"ТОВ Альфа","email":"a@alfa.ua"}'

# Товари
curl -X POST localhost:5000/api/products \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ноутбук","price":"24999.00","sku":"NB-1"}'

# Замовлення (сума порахується сервером)
curl -X POST localhost:5000/api/orders \
  -H 'Content-Type: application/json' \
  -d '{"client_id":1,"items":[{"product_id":1,"quantity":2}]}'
# → {"id":1,"total_amount":"49998.00","items":[...],"status":"created", ...}

# Замовлення клієнта
curl localhost:5000/api/clients/1/orders
```

> Гроші завжди серіалізуються рядком (`"49998.00"`), щоб не втрачати точність.

## Бізнес-правила

| Правило | Де гарантується |
|---|---|
| Замовлення не може існувати без клієнта | NOT NULL FK + перевірка в `services` (404) |
| У замовленні має бути ≥ 1 позиція | Pydantic `min_length=1` + перевірка в `services` |
| Сума рахується автоматично сервером | `services.create_order` (клієнтську суму ігноруємо) |
| Товар у позиції має існувати | `services` (404, відкат транзакції) |
| Ціна в замовленні не змінюється згодом | snapshot `unit_price` у `OrderItem` |

Створення замовлення — **атомарне**: будь-яка помилка відкочує транзакцію.

## Тести

```bash
# Backend
.venv/bin/pytest -q                 # 19 тестів: бізнес-правила, snapshot ціни, конфлікти, ліміти

# Frontend
cd frontend && npm test             # 8 тестів: API-клієнт, форматування, компоненти
```

## Чому саме такий підхід

- **Шарова архітектура** (`routes → schemas → services → models`). Контролери
  тонкі; домен ізольований і тестований. Це масштабується під реальний ERP.
- **Окрема таблиця `OrderItem`.** В умові 3 сутності, але без таблиці-зв'язку з
  кількістю не можна коректно зберігати склад замовлення. Це 4-та сутність, без
  якої «облік» не є обліком.
- **Snapshot ціни (`unit_price`).** Зміна ціни товару не повинна переписувати
  історію вже створених замовлень — базова вимога будь-якої облікової системи.
- **`Decimal`/`Numeric(12,2)` для грошей**, ніколи `float`. У JSON — рядок.
- **Сума рахується лише на сервері.** Клієнт не може нав'язати свою суму;
  фронтовий live-підрахунок — суто UX-прев'ю.
- **`DATABASE_URL`** — SQLite для швидкого старту, PostgreSQL для продакшену без
  зміни коду.
- **Pydantic** — валідація на межі застосунку як перша лінія захисту правил.
- **Стійкість до помилок**: єдиний JSON-формат для 404/409/422/500, відкат
  транзакції в обробниках, увімкнені foreign keys у SQLite, гард точності сум.
- **React + TypeScript**: типізований API-клієнт (типи дзеркалять схеми бекенду),
  цілісна дизайн-система (токени, світла/темна теми, адаптивність, a11y).
