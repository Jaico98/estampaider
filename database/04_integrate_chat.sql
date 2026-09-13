-- Integración aditiva del chat existente. MySQL 8+.
-- Aplicar sobre copia respaldada ANTES de desplegar el backend con ChatMensaje.usuario.
-- No elimina conversaciones, cotizaciones ni columnas. DDL realiza commits implícitos.
SET @chat_column_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'chat_mensaje' AND column_name = 'usuario_id');
SET @chat_ddl = IF(@chat_column_exists = 0,
    'ALTER TABLE chat_mensaje ADD COLUMN usuario_id BIGINT NULL', 'SELECT 1');
PREPARE chat_stmt FROM @chat_ddl;
EXECUTE chat_stmt;
DEALLOCATE PREPARE chat_stmt;

-- Asociación por teléfono colombiano normalizado, solo si hay UNA cuenta candidata.
-- La cuenta identifica la conversación del cliente, no necesariamente al emisor (tipo).
UPDATE chat_mensaje c
JOIN (
    SELECT CASE WHEN LENGTH(digitos) = 10 THEN CONCAT('57', digitos) ELSE digitos END AS telefono,
           MIN(id) AS usuario_id
    FROM (SELECT id, REGEXP_REPLACE(telefono, '[^0-9]', '') AS digitos FROM usuarios) u
    WHERE digitos <> ''
    GROUP BY CASE WHEN LENGTH(digitos) = 10 THEN CONCAT('57', digitos) ELSE digitos END
    HAVING COUNT(*) = 1
) cuenta ON cuenta.telefono = CASE
    WHEN LENGTH(REGEXP_REPLACE(c.telefono, '[^0-9]', '')) = 10
        THEN CONCAT('57', REGEXP_REPLACE(c.telefono, '[^0-9]', ''))
    ELSE REGEXP_REPLACE(c.telefono, '[^0-9]', '') END
SET c.usuario_id = cuenta.usuario_id
WHERE c.usuario_id IS NULL;

SET @chat_fk_exists = (SELECT COUNT(*) FROM information_schema.key_column_usage
    WHERE table_schema = DATABASE() AND table_name = 'chat_mensaje'
      AND column_name = 'usuario_id' AND referenced_table_name = 'usuarios'
      AND referenced_column_name = 'id');
SET @chat_ddl = IF(@chat_fk_exists = 0,
    'ALTER TABLE chat_mensaje ADD CONSTRAINT fk_chat_mensaje_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)',
    'SELECT 1');
PREPARE chat_stmt FROM @chat_ddl;
EXECUTE chat_stmt;
DEALLOCATE PREPARE chat_stmt;

SELECT COUNT(*) AS mensajes_totales, COUNT(usuario_id) AS asociados,
       COUNT(*) - COUNT(usuario_id) AS pendientes_de_revision FROM chat_mensaje;
SELECT COUNT(*) AS referencias_invalidas FROM chat_mensaje c
LEFT JOIN usuarios u ON u.id = c.usuario_id WHERE c.usuario_id IS NOT NULL AND u.id IS NULL;
