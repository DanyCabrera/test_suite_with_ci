# Barbería Norte

Sistema de reserva de citas con frontend React, API FastAPI y PostgreSQL. Incluye pruebas unitarias, de integración con Testcontainers, de extremo a extremo con Cypress y de carga con k6. GitHub Actions las ejecuta en cada `push` y cada `pull_request`.

La justificación de tecnologías está en [docs/justificacion_tecnologica.md](docs/justificacion_tecnologica.md). Para entregarla en PDF, ábrela en el visor y usa Imprimir, o genera el archivo con Pandoc:

```bash
pandoc docs/justificacion_tecnologica.md -o docs/justificacion_tecnologica.pdf
```

## Requisitos

- Python 3.10 o superior (GitHub Actions usa 3.12)
- Node.js 20
- Docker, para PostgreSQL local, Testcontainers y los jobs de extremo a extremo y carga

## Puesta en marcha

Desde la raíz del repositorio:

```bash
docker compose up -d
```

API:

```bash
cd backend
python -m venv .venv
```

En Windows, activa el entorno con `.venv\Scripts\Activate.ps1`. En macOS o Linux, con `source .venv/bin/activate`.

```bash
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

En macOS o Linux el archivo de entorno se copia con `cp .env.example .env`. Al arrancar, la API aplica las migraciones y carga la semilla si las tablas están vacías. La documentación interactiva queda en `http://localhost:8000/docs`.

Frontend, en otra terminal:

```bash
cd frontend
npm install
npm run dev
```

La aplicación queda en `http://localhost:5173`. La URL de la API se toma de `VITE_API_URL` (`frontend/.env.example`).

## Usuarios semilla

Son cuentas de desarrollo. Las contraseñas viven en `backend/.env.example` y en la semilla; no forman parte de la justificación en PDF.

| Correo | Rol | Contraseña |
| --- | --- | --- |
| `admin@example.com` | administración | `admin-dev-pass` |
| `barbero1@example.com` | barbero (Mateo Ruiz) | `barber-dev-pass` |
| `barbero2@example.com` | barbero (Leo Vargas) | `barber-dev-pass` |

Los clientes se registran desde la interfaz. El horario de atención es de lunes a sábado, de 09:00 a 18:00, hora de Ciudad de México.

Servicios iniciales: Corte (30 min), Barba (30 min), Corte y barba (60 min) y Cejas (15 min).

## Pruebas

Unitarias e integración, desde `backend/`:

```bash
pytest -q
```

Las de integración arrancan un PostgreSQL 16 con Testcontainers. Hace falta Docker en ejecución.

Frontend, desde `frontend/`:

```bash
npm test
npm run build
```

Extremo a extremo: con la API en el puerto 8000 y Vite en el 5173,

```bash
cd e2e
npm install
npx cypress run
```

Carga, con la API ya levantada. El perfil de CI usa 10 usuarios virtuales durante 30 segundos. En local se puede alargar sin cambiar el script:

```bash
k6 run load/api.js
k6 run -e VUS=50 -e DURATION=2m load/api.js
```

El escenario falla si la tasa de error llega al 1 % o si el percentil 95 supera 500 ms. Consulta `GET /services`, `GET /barbers` y, con un cliente creado en el setup, `GET /appointments/me`.

## GitHub Actions

El workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) define cuatro checks:

- `backend`: pytest unitario e integración
- `frontend`: Vitest y build
- `e2e`: Docker Compose, API, Vite y Cypress
- `load`: API y k6 en el escenario corto

Para que un cambio no se pueda aprobar con pruebas fallidas, en GitHub abre Settings, Branches, y en la regla de la rama principal marca como obligatorios los checks `backend`, `frontend`, `e2e` y `load`.
