<div align="center">

# AiutoX ERP

**Tus datos, trabajando para ti.**

Plataforma ERP open-source y multi-tenant construida para la forma en que las personas realmente trabajan —
no la forma en que los contadores quisieran que lo hicieran.

[Primeros pasos](#primeros-pasos) · [Funcionalidades del core](#funcionalidades-del-core) · [Instalar un modulo](#instalando-modulos-de-negocio) · [Crear un modulo](#creando-modulos-personalizados) · [English](README.md)

</div>

---

## Que es AiutoX ERP?

AiutoX ERP es un sistema ERP modular y orientado a eventos, disenado para empresas medianas que estan cansadas de software que las obliga a adaptarse a el. El nombre combina *Aiuto* (ayuda en italiano) con *X* de extensibilidad — porque esta plataforma existe para ayudar, no para estorbar.

La filosofia central es simple: **tus datos deben trabajar para ti**. AiutoX conecta la informacion de tu organizacion de forma automatica, muestra lo que importa en contexto, y te permite construir los flujos de trabajo que realmente necesitas — no los que un proveedor decidio que debias tener.

### Por que AiutoX es diferente

La mayoria de los sistemas ERP son bodegas de datos. Lo guardan todo y no muestran nada. AiutoX esta disenado desde la premisa opuesta:

- **Conciencia contextual** — tareas, aprobaciones, notificaciones y automatizaciones estan conectadas. Cuando algo cambia, las personas correctas lo saben de inmediato, sin que nadie tenga que revisar un dashboard.
- **Automatizacion primero** — el motor de automatizacion ejecuta reglas y flujos asistidos por IA en cualquier modulo. El trabajo repetitivo desaparece sin necesidad de un desarrollador.
- **Modular por diseno** — habilita solo lo que necesitas. Los modulos estan aislados; deshabilitar uno nunca rompe otro. Los modulos de negocio se instalan como paquetes, no como switches de configuracion.
- **Disenado para operadores, no solo administradores** — trabajadores de campo, supervisores y usuarios finales tienen vistas optimizadas para su realidad, no una sola pantalla que todos deben compartir.
- **Nucleo orientado a eventos** — cada accion en el sistema emite un evento. Los modulos reaccionan a eventos, no entre si. Esto significa que puedes extender el sistema sin tocar el nucleo.
- **Listo para PWA** — la plataforma se instala en dispositivos moviles y el modulo de recoleccion de datos soporta operacion sin conexion para equipos en campo.

---

## Funcionalidades del Core

Estos modulos vienen incluidos en cada instalacion de AiutoX sin costo adicional:

| Modulo | Que hace |
|---|---|
| **Autenticacion y RBAC** | Auth multi-tenant con JWT, sistema de roles y permisos detallados por modulo |
| **Gestion de usuarios y tenants** | Ciclo de vida completo de usuarios, aislamiento de tenants, configuracion de modulos por tenant |
| **Gestion de tareas** | Tareas con estados personalizados, flujos de trabajo, asignaciones, aprobaciones y automatizaciones de estado |
| **Calendario y eventos** | Calendarios compartidos, programacion de eventos, sincronizacion con calendarios externos |
| **Flujos de aprobacion** | Flujos de aprobacion multi-etapa configurables para cualquier entidad |
| **Motor de automatizacion** | Automatizacion basada en reglas + agentes de IA que actuan sobre eventos del sistema |
| **Notificaciones** | Email, SMS, en-app, webhook — todo configurable por tipo de evento |
| **Gestion de archivos** | Almacenamiento seguro de archivos con aislamiento por tenant y organizacion en carpetas |
| **Comentarios y colaboracion** | Comentarios en hilo sobre cualquier entidad en cualquier modulo |
| **Plantillas** | Plantillas de contenido reutilizables para documentos y mensajes recurrentes |
| **Bus de eventos PubSub** | Bus de eventos basado en Redis Streams con interfaz de gestion de streams y grupos |
| **Motor de reportes** | Reportes multi-modulo con filtrado y exportacion |
| **Gamificacion** | Puntos, insignias y tablas de clasificacion para impulsar el compromiso |
| **Importacion y exportacion** | Importacion y exportacion masiva de datos para todas las entidades core |
| **Busqueda** | Busqueda de texto completo en todos los modulos |
| **Etiquetas** | Sistema de etiquetado disponible para todos los modulos |
| **Linea de tiempo de actividades** | Registro de auditoria y feed de actividad por entidad |
| **Vistas y filtros** | Filtros guardados y vistas personalizadas por usuario |
| **Integraciones** | Gestion de webhooks y configuracion de integraciones con terceros |
| **Configuracion y ajustes** | Temas por tenant, acciones rapidas, roles y configuracion del sistema |

---

## Arquitectura

AiutoX es un **monolito modular** — no microservicios, pero cada modulo esta completamente encapsulado. Los modulos nunca se importan directamente entre si; se comunican exclusivamente a traves del bus de eventos.

```
frontend/                     # React + TypeScript + Vite + TailwindCSS
  app/features/               # Una carpeta por modulo (core + instalados)
  app/lib/                    # Compartido: cliente API, auth, i18n, stores

backend/                      # FastAPI + Python + SQLAlchemy + Alembic
  app/core/                   # Infraestructura compartida (auth, pubsub, config...)
  app/modules/                # Ubicacion de instalacion de modulos de negocio
  app/sdk/                    # SDK publico para construir modulos
  config/modules.json         # Registro de modulos (habilitados/deshabilitados por tenant)

migrations/                   # Sistema de migraciones multi-branch con Alembic
```

**Stack:** FastAPI · PostgreSQL 16 · Redis 7 (Streams + Cache) · React · TypeScript · Vite · TailwindCSS v4 · shadcn/ui

---

## Primeros Pasos

### Requisitos previos

| Herramienta | Version | Proposito |
|---|---|---|
| Git | latest | Control de versiones |
| Docker + Docker Compose | latest | Entorno local (recomendado) |
| Node.js | 20+ | Desarrollo frontend |
| Python | 3.12+ | Desarrollo backend |
| uv | latest | Gestion de paquetes Python |

### Inicio rapido con Docker

```bash
git clone https://github.com/AiutoX/aiutox-erp.git
cd aiutox-erp

# Copiar archivos de entorno
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Iniciar todo
docker compose up -d
```

La aplicacion esta disponible en `http://localhost:5173`. Documentacion de la API en `http://localhost:8000/docs`.

### Configuracion manual (desarrollo)

```bash
# Backend
cd backend
uv sync
cp .env.example .env          # Completa DATABASE_URL, REDIS_URL, SECRET_KEY
uv run alembic upgrade heads  # Ejecutar migraciones
uv run uvicorn app.main:app --reload --port 8000

# Frontend (terminal separada)
cd frontend
npm install
npm run generate-routes       # Generar archivo de rutas desde modulos descubiertos
cp .env.example .env
npm run dev
```

### Variables de entorno

**Backend (`backend/.env`):**

| Variable | Requerida | Descripcion |
|---|---|---|
| `DATABASE_URL` | Si | Cadena de conexion PostgreSQL |
| `REDIS_URL` | Si | Cadena de conexion Redis |
| `SECRET_KEY` | Si | Secreto de firma JWT (genera una cadena aleatoria larga) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | No | SMTP de respaldo a nivel de instancia. Cada tenant configura su propio servidor de email desde la UI en **Configuracion → Notificaciones** (host, puerto, credenciales, TLS, direccion de envio, boton de prueba incluido). La configuracion por tenant tiene prioridad siempre; estas variables solo se usan cuando el tenant no ha configurado su propio SMTP. |

**Frontend (`frontend/.env`):**

| Variable | Requerida | Descripcion |
|---|---|---|
| `VITE_API_URL` | Si | URL de la API backend (ej. `http://localhost:8000`) |

### Verificar la instalacion

| Servicio | URL |
|---|---|
| Frontend | `http://localhost:5173` |
| API Backend | `http://localhost:8000` |
| Explorador de API (Swagger) | `http://localhost:8000/docs` |
| Health check | `http://localhost:8000/health/ready` |

---

## Instalando Modulos de Negocio

Los modulos de negocio (Inmobiliaria, CRM, Facturacion, Inventario, y mas) se distribuyen como paquetes pip + npm a traves de GitHub Packages.

### Instalacion con un solo comando

```bash
export GH_PACKAGES_TOKEN=tu_token_aqui
bash scripts/install-module.sh real_estate
```

Este comando instala el paquete Python, el paquete npm, crea el enlace del frontend, regenera las rutas y ejecuta las migraciones de forma automatica.

### Instalacion manual

```bash
# 1. Instalar paquete backend
pip install aiutox-module-real-estate \
  --extra-index-url "https://__token__:${GH_PACKAGES_TOKEN}@pypi.pkg.github.com/aiutoxchile/simple/"

# 2. Instalar paquete frontend
npm install @aiutox/module-real-estate \
  --registry https://npm.pkg.github.com

# 3. Enlazar feature en el frontend y regenerar rutas
npx tsx scripts/link-external-features.ts
npm run generate-routes

# 4. Ejecutar migraciones de base de datos
uv run alembic upgrade heads
```

Reinicia la aplicacion despues de instalar modulos.

---

## Creando Modulos de Negocio

Un modulo de negocio es un paquete autocontenido — un wheel de Python para el backend y un paquete npm para el frontend — que se conecta al core sin modificarlo. El core descubre tu modulo automaticamente al iniciar a traves de un entry point de Python; sin archivos de registro que editar, sin listas de rutas que actualizar.

### 1. Partir de la plantilla

```bash
cp -r aiutox-module-template/ aiutox-module-mi-modulo/
cd aiutox-module-mi-modulo

# Reemplazar TEMPLATE con el nombre de tu modulo en todos los archivos
find . -name "*TEMPLATE*" | while read f; do mv "$f" "${f//TEMPLATE/mi_modulo}"; done
find . -type f | xargs sed -i 's/TEMPLATE/mi_modulo/g'
```

La plantilla ya incluye la estructura de directorios completa:

```
aiutox-module-mi-modulo/
  backend/
    pyproject.toml                      # Paquete Python + declaracion del entry point
    aiutox_module_mi_modulo/
      __init__.py                       # Subclase de ModuleInterface (punto de conexion)
      api.py                            # Router de FastAPI
      models/                           # Modelos SQLAlchemy (tenant_id obligatorio en cada tabla)
      schemas/                          # Schemas Pydantic v2
      services/                         # Logica de negocio
      repositories/                     # Capa de acceso a datos
      migrations/versions/              # Migraciones Alembic (rama independiente)
  frontend/
    package.json                        # @aiutox/module-mi-modulo
    app/features/mi_modulo/
      routes.config.ts                  # Definicion de rutas (auto-descubierto)
      i18n/en.ts                        # Traducciones en ingles (auto-descubiertas)
      i18n/es.ts                        # Traducciones en espanol
      index.ts                          # Exports del feature
      components/                       # Componentes React
      api/                              # Funciones de cliente API (usar apiClient, nunca fetch)
      types/                            # Tipos TypeScript
```

### 2. Como se conecta el backend al core

El unico punto de conexion es la subclase de `ModuleInterface` en `__init__.py`. El core llama a sus metodos para descubrir rutas, items de navegacion, migraciones y dependencias — tu modulo nunca importa del core, solo del SDK.

```python
from pathlib import Path
from aiutox_sdk.module_interface import ModuleInterface, ModuleNavigationItem
from fastapi import APIRouter

class MiModulo(ModuleInterface):

    @property
    def module_id(self) -> str:
        return "mi_modulo"                    # clave unica, snake_case

    @property
    def module_type(self) -> str:
        return "business"

    @property
    def enabled(self) -> bool:
        return True

    def get_router(self) -> APIRouter | None:
        from aiutox_module_mi_modulo.api import router
        return router                         # las rutas se registran bajo /api/v1/

    def get_models(self) -> list:
        from aiutox_module_mi_modulo.models.mi_modelo import MiModelo
        return [MiModelo]                     # entregado a Alembic para descubrimiento de migraciones

    def get_dependencies(self) -> list[str]:
        return ["auth", "users"]              # modulos core que este modulo requiere

    @classmethod
    def get_migrations_path(cls) -> str | None:
        return str(Path(__file__).parent / "migrations" / "versions")

    def get_navigation_items(self) -> list[ModuleNavigationItem]:
        return [
            ModuleNavigationItem(
                id="mi_modulo.main",
                label="Mi Modulo",
                path="/mi-modulo",
                permission="mi_modulo.view",  # guardia RBAC
                icon="box",                   # nombre de icono Lucide
                order=10,
            )
        ]
```

La plataforma descubre esta clase a traves de un entry point de Python declarado en `pyproject.toml`:

```toml
[project]
name = "aiutox-module-mi-modulo"
version = "0.1.0"
dependencies = ["aiutox-sdk>=1.0.0"]

[project.entry-points."aiutox.modules"]
mi_modulo = "aiutox_module_mi_modulo:MiModulo"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

No hay ningun otro archivo en el core que modificar. Al iniciar, el backend escanea todos los paquetes instalados en busca del grupo de entry points `aiutox.modules` y carga cada modulo que encuentra.

### 3. Lo que el SDK te da

Tu modulo solo importa de `aiutox-sdk`. El SDK expone las interfaces y helpers que necesitas sin acoplar tu codigo a los detalles internos del core:

| Export del SDK | Que provee |
|---|---|
| `ModuleInterface` | Clase base que el core llama para descubrir tu modulo |
| `ModuleNavigationItem` | Dataclass para items de navegacion |
| Servicios core (via inyeccion de dependencias) | `NotificationService`, `ConfigService`, `EventPublisher`, `FileService` — inyectados en tus rutas FastAPI via `Depends()` |
| PubSub events | Publicar eventos con `EventPublisher`; suscribirse a eventos de otros modulos |

**Los modulos nunca se importan entre si directamente.** Si tu modulo necesita reaccionar a algo que hace otro modulo (ej. un pago confirmado), suscribete al evento en el bus PubSub:

```python
# En el consumer de eventos de tu modulo
from aiutox_sdk.pubsub import EventConsumer

consumer = EventConsumer(group="mi_modulo", stream="billing.payment.confirmed")

@consumer.handler
async def on_payment_confirmed(event):
    tenant_id = event.tenant_id        # siempre filtrar por tenant
    # tu logica aqui
```

### 4. Como se conecta el frontend al core

Solo se necesitan dos archivos. El core los descubre automaticamente — nunca editas un archivo central de rutas ni una config de navegacion.

**`routes.config.ts`** — declara que rutas URL pertenecen a tu modulo:

```typescript
export const moduleKey = "mi_modulo";

export const routes = [
  { path: "/mi-modulo",         file: "features/mi_modulo/pages/Index.tsx" },
  { path: "/mi-modulo/:id",     file: "features/mi_modulo/pages/Detail.tsx" },
  { path: "/mi-modulo/create",  file: "features/mi_modulo/pages/Create.tsx" },
];
```

Ejecutar `npm run generate-routes` (o instalar el modulo via `install-module.sh`) detecta este archivo y agrega tus rutas a la app automaticamente.

**`i18n/en.ts`** y **`i18n/es.ts`** — las traducciones se auto-descubren via `import.meta.glob` de Vite; no hace falta ningun import en el index de i18n compartido.

**Las llamadas a la API** siempre deben ir a traves de `apiClient` de `~/lib/api/client`, nunca directamente con `fetch` o `axios`:

```typescript
import { apiClient } from "~/lib/api/client";

export const getMisItems = (params: ListParams) =>
  apiClient.get("/mi-modulo/items", { params });
```

**La navegacion** la maneja completamente el backend. El metodo `get_navigation_items()` en tu `ModuleInterface` le dice al frontend que entradas de menu mostrar y que permiso verificar — sin ningun archivo de configuracion de navegacion en el frontend.

### 5. Migraciones de base de datos

Cada modulo administra su propia rama de migraciones Alembic, independiente del core y de otros modulos:

```bash
cd backend
alembic revision --autogenerate \
  -m "initial mi_modulo tables" \
  --head=mi_modulo@head \
  --branch-label=mi_modulo \
  --version-path=aiutox_module_mi_modulo/migrations/versions
```

Cuando el modulo se instala, `alembic upgrade heads` aplica todos los heads pendientes incluyendo el tuyo. Cuando se desinstala, la rama simplemente no se aplica — sin conflicto con otros modulos.

Cada tabla que tu modulo crea **debe** incluir una columna `tenant_id UUID NOT NULL`. El core refuerza el aislamiento de tenant en la capa de API, pero tus queries de repositorio tambien deben filtrar siempre por el.

### 6. Instalar tu modulo localmente

```bash
# Desde el directorio aiutox-erp
pip install -e ./aiutox-module-mi-modulo/backend

cd frontend
npm install ../aiutox-module-mi-modulo/frontend
npx tsx scripts/link-external-features.ts
npm run generate-routes

cd ../backend
alembic upgrade heads
```

Reinicia el backend. Las rutas, la navegacion y las migraciones de tu modulo ya estan activas.

---

## Contribuir

1. Haz un fork del repositorio
2. Crea una rama: `git checkout -b feat/mi-feature`
3. Abre un pull request

Lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de enviar cambios.

---

## Licencia

**Plataforma core:** Licencia MIT — libre de usar, modificar y distribuir.

**Modulos de negocio:** Distribuidos por separado bajo licencias propietarias. Ver repositorios individuales de cada modulo para los terminos.

---

<div align="center">
Construido con FastAPI, React, PostgreSQL y Redis.
</div>
