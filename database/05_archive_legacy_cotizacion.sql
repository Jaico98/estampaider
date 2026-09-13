-- Ejecutar SOLO después de desplegar el backend sin Cotizacion/WhatsAppWebhookController.
-- Hacer respaldo externo primero. No destruye datos: renombra la tabla y permite recuperarla.
-- Si ambas tablas existen, revisar manualmente. No se ejecuta al iniciar la aplicación.
SET @legacy_exists = (SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'cotizacion');
SET @archive_exists = (SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'cotizacion_respaldo_20260913');
SET @archive_sql = IF(@legacy_exists = 1 AND @archive_exists = 0,
    'RENAME TABLE cotizacion TO cotizacion_respaldo_20260913',
    'SELECT ''Sin cambios: comprobar si ya está archivada o si existe conflicto de nombres'' AS resultado');
PREPARE archive_stmt FROM @archive_sql;
EXECUTE archive_stmt;
DEALLOCATE PREPARE archive_stmt;
SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()
AND table_name IN ('cotizacion', 'cotizacion_respaldo_20260913');
-- Recuperación manual, solo si cotizacion no existe:
-- RENAME TABLE cotizacion_respaldo_20260913 TO cotizacion;
