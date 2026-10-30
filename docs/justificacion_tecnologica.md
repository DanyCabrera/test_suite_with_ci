# Justificación tecnológica — Barbería Norte

Sistema de reserva de citas para una barbería. Este documento explica por qué se eligió cada pieza del stack y cómo la suite de pruebas cubre el flujo real del negocio. Está escrito para exportarse a PDF (desde el visor de Markdown o con Pandoc) y acompañar la entrega del curso.

## 1. Objetivo

El sistema permite que un cliente cree una cuenta, elija servicio y barbero, reserve un horario libre y cancele su propia cita. Un barbero consulta la agenda de su día y marca citas como atendidas. Una cuenta de administración ve toda la agenda y da de alta o edita servicios.

La regla central es que un barbero no puede tener dos citas solapadas. El horario sale de la jornada de lunes a sábado, de 09:00 a 18:00 (America/Mexico_City), en bloques del tamaño del servicio.

## 2. Arquitectura

Un solo repositorio, con fronteras claras:

- `frontend/`: aplicación React que habla con la API por HTTP y guarda el token en el navegador.
- `backend/`: API FastAPI, migraciones Alembic y acceso a PostgreSQL.
- `e2e/`: Cypress, contra la interfaz y la API ya levantadas.
- `load/`: escenario de k6 contra la API.
- `.github/workflows/ci.yml`: ejecución automática en cada `push` y cada `pull_request`.

El cliente nunca escribe en la base de datos. Toda regla de negocio (rol, horario, solapamiento) se decide en el backend. La interfaz solo muestra lo que la API autoriza.

## 3. Frontend: React, Vite y TypeScript

React organiza la reserva en pantallas (cuenta, catálogo, reserva, mis citas, agenda y servicios) y mantiene la sesión en un contexto. Vite da un servidor de desarrollo inmediato y un build estático que Cypress y GitHub Actions pueden levantar sin configuración extra. TypeScript fija el contrato de citas, servicios y roles en el cliente, de modo que un campo mal nombrado falla al compilar y no en el navegador del usuario.

Vitest cubre funciones puras de la interfaz: formato de hora en Ciudad de México y validación de formularios (campos vacíos, correo, teléfono y longitud de contraseña). El recorrido visual no se duplica aquí; eso corresponde a Cypress.

## 4. Backend: FastAPI, SQLAlchemy y Alembic

FastAPI publica endpoints tipados y un contrato OpenAPI en `/docs` sin mantener un documento aparte. Encaja con pruebas HTTP mediante `TestClient`. SQLAlchemy 2 modela usuarios, servicios y citas, y Alembic versiona el esquema para que desarrollo, pruebas e integración continua partan de la misma migración.

Los endpoints quedan definidos así:

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET /services`, `POST /services`, `PATCH /services/{id}`
- `GET /barbers`, `GET /barbers/{id}/availability`
- `POST /appointments`, `GET /appointments/me`, `GET /appointments`
- `PATCH /appointments/{id}/cancel`, `PATCH /appointments/{id}/complete`
- `GET /health`

La generación de huecos y la detección de solapamiento viven en funciones sin base de datos. Así se pueden probar con fechas fijas, sin Docker. La persistencia y los permisos se prueban contra PostgreSQL real.

## 5. PostgreSQL

Las citas relacionan cliente, barbero y servicio, y el solapamiento se consulta con intervalos de tiempo. Un motor relacional expresa esas relaciones con llaves foráneas y rechaza datos huérfanos. PostgreSQL 16 es el mismo motor en local (Docker Compose), en las pruebas de integración (Testcontainers levanta un contenedor) y en GitHub Actions. No hay un sustituto en memoria que oculte diferencias de tipos o de zonas horarias.

Las horas se guardan con zona (`timestamptz`). La jornada se interpreta siempre en America/Mexico_City, así un runner en UTC y un navegador en otra zona acuerdan el mismo día y la misma hora.

## 6. Autenticación: JWT y passlib/bcrypt

La sesión no se guarda en el servidor: el login devuelve un JWT de vida corta con el identificador y el rol. Cada endpoint protegido lo exige. Las contraseñas se almacenan con hash bcrypt a través de passlib; el registro solo crea clientes. Barberos y administración nacen en la semilla de desarrollo, así que un cliente no puede escalar su propio rol.

## 7. Pruebas

**Unitarias (pytest).** Huecos de 30 y 60 minutos dentro de la jornada, domingo cerrado, solapamiento parcial rechazado, citas contiguas aceptadas, hash y verificación de contraseña, JWT inválido, duración no positiva y cita en el pasado.

**Integración (pytest + Testcontainers).** Un contenedor PostgreSQL 16 recibe las migraciones y la semilla. Se comprueba que el registro y el login producen un token usable en `/auth/me`, que la reserva persiste y desaparece de la disponibilidad, que una segunda reserva del mismo intervalo responde 409, que otro cliente recibe 403 al cancelar, y que un barbero no lista la agenda de otro mientras la administración sí ve todas las citas.

**E2E (Cypress).** El primer flujo registra un cliente en la interfaz, elige servicio y barbero, reserva el primer horario libre, lo ve en Mis citas y lo cancela. El segundo crea una cita por la API y comprueba que el barbero la ve en su agenda del día correspondiente.

**Carga (k6).** Diez usuarios virtuales durante 30 segundos consultan servicios, barberos y las citas del cliente autenticado. El job falla si la tasa de error llega al 1 % o si el percentil 95 pasa de 500 ms. El mismo script admite un perfil local más largo (`VUS=50`) que no se ejecuta en cada pull request.

## 8. GitHub Actions

El workflow `ci` dispara cuatro checks en cada push y cada pull request: `backend`, `frontend`, `e2e` y `load`. El de extremo a extremo espera a que compilen backend y frontend, levanta PostgreSQL con Docker Compose y recorre Cypress contra API e interfaz reales. El de carga hace lo mismo con k6.

GitHub Actions marca el check como fallido. Para que ninguna pull request se pueda aprobar con pruebas rojas, en la rama principal hay que marcar esos cuatro checks como obligatorios (Settings, Branches, branch protection). El workflow no puede imponer esa regla por sí solo; el README indica el paso.

## 9. Conclusión

La combinación responde al tipo de sistema: una interfaz de reserva, una API con reglas de horario y roles, y una base relacional. Cada nivel de prueba cubre una capa distinta —funciones puras, base de datos real, navegador y capacidad— y GitHub Actions las ejecuta juntas antes de integrar un cambio.
