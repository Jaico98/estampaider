# Estampaider

**PLATAFORMA WEB PARA LA GESTIÓN COMERCIAL Y PRESENTACIÓN DE PRODUCTOS PERSONALIZADOS DEL EMPRENDIMIENTO ESTAMPAIDER.**

Este repositorio contiene el desarrollo del proyecto de grado de Ingeniería de Sistemas titulado:

**“Plataforma web para la gestión comercial y presentación de productos personalizados del emprendimiento Estampaider”**

La solución fue desarrollada para apoyar la presentación de productos personalizados, el registro de pedidos, la consulta de solicitudes y la administración de información comercial del emprendimiento.

## Página desplegada

Frontend publicado en GitHub Pages:

https://jaico98.github.io/estampaider/

## Objetivo del proyecto

Desarrollar una plataforma web para apoyar la gestión comercial del emprendimiento Estampaider, mediante la presentación de productos personalizados en catálogo dinámico, el registro y consulta de pedidos, y la administración centralizada de la información del negocio.

## Alcance funcional

La plataforma incluye las siguientes funcionalidades principales:

* Visualización de catálogo dinámico de productos.
* Búsqueda y filtrado de productos.
* Carrito de compras para organizar productos seleccionados.
* Registro de pedidos con datos del cliente.
* Consulta de los pedidos asociados con la cuenta autenticada.
* Redirección a WhatsApp como canal externo de contacto y cotización.
* Formulario de mensajes de contacto.
* Visualización y gestión de reseñas.
* Panel administrativo protegido.
* Gestión de productos.
* Gestión de pedidos y actualización de estados.
* Gestión de mensajes recibidos.
* Gestión de contenido multimedia mediante Cloudinary.
* Gestión de branding y elementos visuales del sitio.
* Chat interno en tiempo real entre clientes autenticados y administrador, con persistencia del historial de conversaciones.

## Delimitación del alcance

La versión actual del sistema no incluye:

* Pasarela de pagos en línea.
* Validación bancaria automática.
* Procesamiento automático de transacciones.
* Facturación electrónica.
* Aplicación móvil nativa.
* Dominio propio.
* Pruebas de carga o estrés.
* Integración oficial completa con WhatsApp Business API.
* Automatización certificada de mensajes por WhatsApp.

WhatsApp se utiliza únicamente como canal externo de contacto y cotización. El número de teléfono se utiliza como dato de contacto y como identificador para el inicio de sesión del cliente; la consulta de pedidos se realiza a partir de la sesión autenticada y de la relación persistente pedidos.usuario_id.

## Tecnologías utilizadas

### Frontend

* HTML
* CSS
* JavaScript
* GitHub Pages

### Backend

* Java
* Spring Boot
* API REST
* Spring Security
* JWT
* Maven

### Base de datos

* MySQL
* Railway

### Almacenamiento multimedia

* Cloudinary

### Despliegue

* Frontend: GitHub Pages
* Backend: Render
* Base de datos: Railway
* Multimedia: Cloudinary

## Estructura del repositorio

```text
estampaider/
├── docs/
│   └── Archivos publicados del frontend
├── estampaider-backend/
│   └── Backend desarrollado con Spring Boot
├── estampaider-frontend/
│   └── Código fuente del frontend
└── README.md
```

<<<<<<< HEAD
Los scripts de creación, migración y verificación se encuentran en `database/`. El modelo objetivo contiene 19 tablas e incluye `chat_mensaje` como parte del chat interno formal (RF-18, HU-20/HU-21, CU-20/CU-21). Su relación opcional con `usuarios` conserva mensajes históricos sin cuenta identificable. El bot experimental y su módulo `Cotizacion` fueron retirados del backend; los enlaces públicos que abren WhatsApp se conservan. Antes de desplegar esta versión sobre una base existente se debe aplicar `database/04_integrate_chat.sql` y validar sus resultados. El retiro recuperable de la tabla heredada se realiza posteriormente con `database/05_archive_legacy_cotizacion.sql`. Ninguno de estos scripts se ejecuta automáticamente.
=======
Los scripts de creación, migración y verificación del esquema se encuentran en database/. El núcleo relacional normalizado está compuesto por 18 tablas. La base implementada conserva adicionalmente chat_mensaje como estructura operativa complementaria utilizada por el chat interno y cotizacion como estructura heredada de compatibilidad.
>>>>>>> e2e0e3926ef81c757ec71c411ec61c2b929ebf10

## Arquitectura general

El sistema utiliza una arquitectura cliente-servidor. El frontend consume servicios REST expuestos por el backend y utiliza WebSocket/STOMP con SockJS para la comunicación bidireccional del chat interno. El backend procesa la lógica de negocio, gestiona la autenticación mediante JWT, se comunica con MySQL alojado en Railway y utiliza Cloudinary para el almacenamiento de imágenes y videos.

## Módulos principales

### Módulo cliente

Permite consultar productos, filtrar el catálogo, gestionar el carrito, registrar pedidos, consultar los pedidos asociados con la cuenta autenticada, utilizar el chat interno para comunicarse con el administrador, enviar mensajes de contacto y visualizar reseñas.

### Módulo administrador

Permite iniciar sesión, gestionar productos, consultar pedidos, actualizar estados, revisar mensajes de contacto, consultar y responder conversaciones del chat interno, gestionar reseñas, cargar contenido multimedia y modificar elementos visuales del sitio.

### Módulo de pedidos

Registra solicitudes realizadas por los clientes, almacena datos de contacto, productos seleccionados, total estimado y estado del pedido.

### Módulo multimedia

Permite almacenar imágenes y videos mediante Cloudinary, conservando URL persistentes para su uso en productos y elementos visuales de la plataforma.

## Seguridad

El acceso al panel administrativo está protegido mediante autenticación con JWT. Las credenciales, claves y datos sensibles deben configurarse mediante variables de entorno y no deben exponerse directamente en el código fuente.

## Variables de entorno principales

Para ejecutar el backend en producción se requieren variables como:

```text
SPRING_PROFILES_ACTIVE=prod
DB_URL=...
DB_USERNAME=...
DB_PASSWORD=...
JWT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

Las variables asociadas con WhatsApp Business API o servicios de inteligencia artificial no son necesarias para la versión validada del proyecto, debido a que esas funcionalidades no hacen parte del alcance sustentado.

## Ejecución local del backend

Desde la carpeta del backend:

```bash
cd estampaider-backend
./mvnw spring-boot:run
```

En sistemas donde se use Maven instalado globalmente:

```bash
mvn spring-boot:run
```

## Ejecución local del frontend

El frontend puede abrirse desde navegador o ejecutarse mediante una extensión de servidor local, como Live Server en Visual Studio Code.

## Estado del proyecto

Proyecto académico funcional, documentado y desplegado como parte del trabajo de grado de Ingeniería de Sistemas.

## Autor

Jaider Andrés Correa Salcedo
Programa de Ingeniería de Sistemas
Corporación Universitaria Remington
Año 2026

