# Scripts de base de datos de Estampaider

Estos archivos documentan el esquema relacional objetivo en tercera forma normal y la transición desde el esquema heredado.

## Archivos

- `01_schema_3fn.sql`: crea las 19 tablas del modelo objetivo, incluida `chat_mensaje` con su relación opcional hacia `usuarios`. No crea `cotizacion`.
- `02_migrate_legacy_to_3fn.sql`: copia datos del esquema anterior hacia las estructuras normalizadas y conserva las columnas heredadas durante la transición.
- `03_verify_3fn.sql`: verifica tablas, conteos, relaciones y registros que no pudieron ser asociados.
- `04_integrate_chat.sql`: migración aditiva para bases existentes; agrega `chat_mensaje.usuario_id`, asocia cuentas inequívocas y crea su FK sin eliminar mensajes.
- `05_archive_legacy_cotizacion.sql`: operación de mantenimiento opcional para retirar posteriormente la tabla heredada `cotizacion`, después de conservar un respaldo externo y validar que no exista ningún consumidor.

## Transición original desde el esquema heredado

1. Crear un respaldo de la base de datos.
2. Ejecutar primero los scripts sobre una copia o una base de pruebas.
3. Ejecutar `01_schema_3fn.sql` y después `02_migrate_legacy_to_3fn.sql`.
4. Ejecutar `04_integrate_chat.sql` y revisar los casos reportados por `03_verify_3fn.sql`.
5. Confirmar que el backend de este repositorio ya esté actualizado y compilado antes de agregar las restricciones finales o retirar columnas heredadas.
6. Repetir las pruebas funcionales y de integración.

La migración no debe ejecutarse directamente sobre Railway sin respaldo y sin revisar los resultados de `03_verify_3fn.sql`. Las entidades, repositorios y servicios del backend ya fueron alineados con las tablas normalizadas; las columnas heredadas se conservan para permitir una transición verificable. El archivo `01_schema_3fn.sql` contempla que `usuarios.usuario` sea opcional y único cuando exista, debido al formulario público real de registro.

## Actualización del chat sobre una base ya normalizada

1. Respaldar y probar sobre una copia. No repetir `02`: pertenece a la migración original y no es idempotente.
2. Ejecutar `04_integrate_chat.sql` ANTES de desplegar el nuevo backend. MySQL realiza commits implícitos para DDL.
3. Ejecutar `03_verify_3fn.sql`. Las referencias inválidas deben ser cero. Revisar los mensajes sin cuenta; pueden conservar NULL y nunca deben asignarse a una cuenta genérica.
4. Desplegar el backend compilado. No usar `ddl-auto=update` para sustituir la migración: con `validate` la nueva columna debe existir antes del inicio.
5. Repetir CP-26, CP-27 y PI-06 (historial anterior, mensajes nuevos y respuestas), más las comprobaciones de catálogo, acceso y pedidos.
6. En la versión entregada, `cotizacion` permanece físicamente en la base de datos como estructura heredada, pero no es utilizada por el backend ni forma parte del modelo normalizado. `05_archive_legacy_cotizacion.sql` queda documentado como una tarea posterior de mantenimiento; no se ejecuta automáticamente.

Para una base vacía utilizar `01_schema_3fn.sql`; no aplicar la transición histórica `02`.
El archivo crea las 19 tablas y las columnas físicas heredadas que todavía mapean
`Pedido` y `DetallePedido`. Estas columnas de compatibilidad no agregan tablas al
modelo normalizado y no deben retirarse mientras el backend las utilice.
`CREATE TABLE IF NOT EXISTS` no modifica tablas existentes: este cambio no es una
migración para producción. Respaldar y revisar por separado cualquier base parcial.

## Cuenta administrativa inicial

El arranque ya no tiene una contraseña administrativa fija ni restablece cuentas.
Las instalaciones existentes no requieren nuevas variables: se conserva su cuenta,
contraseña y rol. Para crear una cuenta en una instalación nueva, configurar:

- `ADMIN_BOOTSTRAP_ENABLED=true`
- `ADMIN_BOOTSTRAP_USERNAME`: identificador de la nueva cuenta.
- `ADMIN_BOOTSTRAP_PASSWORD`: secreto de al menos 12 caracteres y máximo 72 bytes UTF-8.
- `ADMIN_BOOTSTRAP_EMAIL`: correo no utilizado por otra cuenta.
- `ADMIN_BOOTSTRAP_PHONE`: teléfono no utilizado por otra cuenta.

Después de comprobar el acceso, desactivar la opción y retirar el secreto inicial
del entorno. Si ya existe ese identificador, no se modifica ni se promueve la cuenta.
Si el teléfono o correo pertenece a otra cuenta, se rechaza la creación. Nunca
publicar estos valores. Cambiar de forma privada cualquier contraseña que hubiera
sido expuesta en versiones anteriores; eliminarla del código no borra el historial Git.

## Verificación local aislada

Desde `estampaider-backend`, ejecutar `./mvnw.cmd clean verify` con Java 17.
Las pruebas usan H2 en modo MySQL, cargan el script SQL y arrancan Hibernate con
`validate`, sin conectarse a Railway. Esto comprueba las columnas y el contexto del
backend, pero no sustituye una prueba sobre MySQL real ni acredita el despliegue.
Los resultados de esta suite no deben presentarse como una nueva ejecución de
los casos funcionales del documento de grado.

## Relación y trazabilidad del chat

HU-20/HU-21 → RF-18 → CU-20/CU-21 → ChatMensaje / ChatUsuarioService / ChatMensajeRepository / ChatController → CP-26/CP-27 y PI-06.

`chat_mensaje` tiene 10 columnas: id, usuario_id, nombre, correo, mensaje, telefono, tipo, fecha, leido y recibido. `usuario_id` es una FK opcional a usuarios.id. La cuenta asociada es la del cliente cuya conversación contiene el mensaje, también cuando responde el administrador; `tipo` identifica al remitente. En el modelo, una cuenta tiene 0..* mensajes y cada mensaje se asocia con 0..1 cuenta.

Por eso la relación se describe como «Usuario tiene mensajes en su conversación», no como «Usuario origina» todos los mensajes. No hay una FK a pedidos: no afirmar que cada mensaje pertenece a un pedido específico. Nombre, correo y teléfono se conservan como datos históricos y de enrutamiento, sin sustituir los datos actuales de la cuenta. La asociación de datos no sustituye las verificaciones de autorización del chat.

## Retiro del módulo heredado

El backend no contiene `Cotizacion`, `CotizacionRepository`, `WhatsAppWebhookController` ni `GET /api/pedidos/cotizaciones`. El usuario confirmó que utiliza la redirección a WhatsApp y no el bot automático. La tabla física heredada `cotizacion` puede permanecer en bases existentes por compatibilidad histórica, pero ningún componente de la versión entregada la utiliza. Su eventual retiro requiere respaldo, revisión de dependencias y ejecución manual del script 05.
