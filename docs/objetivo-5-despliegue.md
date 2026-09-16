# Objetivo 5 Despliegue y reversión

## Reversión ante un despliegue fallido

1. Detener el despliegue nuevo y conservar los registros de Railway y Render.
2. Volver a desplegar el commit anterior conocido como estable.
3. Restaurar la base de datos desde el respaldo previo a la migración si el fallo afectó el esquema.
4. Ejecutar `database/03_verify_3fn.sql` y comprobar autenticación, pedidos, catálogo y chat.
5. Registrar la causa y los cambios antes de reintentar.

La migración del chat es aditiva. La eliminación de `cotizacion` se ejecuta después de validar el backend actualizado y de conservar un respaldo externo.

## Disponibilidad del plan gratuito

El servicio de alojamiento gratuito puede suspender la instancia después de un periodo de inactividad. El primer acceso posterior puede tardar mientras la instancia se reactiva. Esta condición debe declararse en el requisito de disponibilidad y verificarse con una solicitud al endpoint de salud antes de presentar evidencias.

## CORS y certificado

En producción configure `APP_CORS_ALLOWED_ORIGINS` con el origen exacto del frontend, separado por comas si hay más de uno. La configuración Spring aplica esos orígenes a REST y WebSocket. Verifique desde el navegador que la respuesta incluya `Access-Control-Allow-Origin` y que el frontend use `https://`. El certificado TLS lo administra el proveedor del dominio o de la plataforma; compruebe su vigencia abriendo la URL HTTPS y revisando el certificado del navegador.

## Procedimiento de despliegue

1. Generar el respaldo con `database/backup_local_interactivo.ps1`.
2. Desplegar el backend con `JPA_DDL_AUTO=validate`.
3. Ejecutar `database/04_integrate_chat.sql` y luego `database/03_verify_3fn.sql`.
4. Probar el flujo de login, pedidos y chat desde el frontend publicado.
5. Ejecutar `database/05_archive_legacy_cotizacion.sql` para retirar la tabla heredada.
