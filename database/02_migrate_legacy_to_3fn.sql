-- Estampaider - migración controlada desde el esquema anterior
--
-- PRECONDICIONES:
-- 1. Sobre una base heredada, ejecutar primero 01_schema_3fn.sql para crear
--    las tablas nuevas que todavía no existan. CREATE TABLE IF NOT EXISTS no
--    modifica las tablas heredadas.
-- 2. Trabajar primero sobre una copia de la base de datos.
-- 3. Generar y conservar un respaldo antes de continuar.
-- 4. Verificar los resultados con 03_verify_3fn.sql.
--
-- Este archivo no elimina las columnas heredadas. Las conserva durante la
-- transición para permitir verificar los datos y actualizar el backend antes
-- del corte final.

-- 1. Agregar las nuevas columnas sin borrar las heredadas.
ALTER TABLE usuarios ADD COLUMN password_hash VARCHAR(255) NULL;
ALTER TABLE productos ADD COLUMN categoria_id BIGINT NULL;
ALTER TABLE pedidos ADD COLUMN direccion_id BIGINT NULL;
ALTER TABLE pedidos ADD COLUMN metodo_pago_id BIGINT NULL;
ALTER TABLE pedidos ADD COLUMN estado_id BIGINT NULL;
ALTER TABLE detalle_pedido ADD COLUMN producto_id BIGINT NULL;
ALTER TABLE detalle_pedido ADD COLUMN producto_nombre VARCHAR(120) NULL;
ALTER TABLE detalle_pedido ADD COLUMN talla_id BIGINT NULL;
ALTER TABLE detalle_pedido ADD COLUMN color_id BIGINT NULL;
ALTER TABLE mensajes ADD COLUMN usuario_id BIGINT NULL;
ALTER TABLE resenas ADD COLUMN usuario_id BIGINT NULL;

-- 2. Copiar la contraseña heredada al nombre normalizado.
UPDATE usuarios
SET password_hash = password
WHERE password_hash IS NULL AND password IS NOT NULL;

-- 3. Crear el catálogo de categorías, incluyendo un valor de transición para
-- productos antiguos sin categoría. Este valor debe revisarse manualmente.
INSERT INTO categorias (nombre, activo)
SELECT DISTINCT TRIM(categoria), TRUE
FROM productos
WHERE categoria IS NOT NULL AND TRIM(categoria) <> ''
ON DUPLICATE KEY UPDATE activo = activo;

INSERT INTO categorias (nombre, activo)
VALUES ('Sin categoría', TRUE)
ON DUPLICATE KEY UPDATE activo = activo;

UPDATE productos p
JOIN categorias c
  ON c.nombre = CASE
      WHEN p.categoria IS NULL OR TRIM(p.categoria) = '' THEN 'Sin categoría'
      ELSE TRIM(p.categoria)
    END
SET p.categoria_id = c.id;

-- 4. Convertir las listas textuales de tallas y colores en catálogos y
-- relaciones muchos a muchos. Se soportan hasta 50 valores separados por coma.
WITH RECURSIVE numeros (n) AS (
    SELECT 1
    UNION ALL
    SELECT n + 1 FROM numeros WHERE n < 50
)
INSERT INTO tallas (nombre)
SELECT DISTINCT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p.tallas_disponibles, ',', numeros.n), ',', -1))
FROM productos p
JOIN numeros
  ON numeros.n <= 1 + LENGTH(p.tallas_disponibles) - LENGTH(REPLACE(p.tallas_disponibles, ',', ''))
WHERE p.tallas_disponibles IS NOT NULL
  AND TRIM(p.tallas_disponibles) <> ''
  AND TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p.tallas_disponibles, ',', numeros.n), ',', -1)) <> ''
ON DUPLICATE KEY UPDATE nombre = nombre;

WITH RECURSIVE numeros (n) AS (
    SELECT 1
    UNION ALL
    SELECT n + 1 FROM numeros WHERE n < 50
)
INSERT INTO colores (nombre)
SELECT DISTINCT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p.colores_disponibles, ',', numeros.n), ',', -1))
FROM productos p
JOIN numeros
  ON numeros.n <= 1 + LENGTH(p.colores_disponibles) - LENGTH(REPLACE(p.colores_disponibles, ',', ''))
WHERE p.colores_disponibles IS NOT NULL
  AND TRIM(p.colores_disponibles) <> ''
  AND TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p.colores_disponibles, ',', numeros.n), ',', -1)) <> ''
ON DUPLICATE KEY UPDATE nombre = nombre;

WITH RECURSIVE numeros (n) AS (
    SELECT 1
    UNION ALL
    SELECT n + 1 FROM numeros WHERE n < 50
)
INSERT IGNORE INTO producto_talla (producto_id, talla_id)
SELECT p.id, t.id
FROM productos p
JOIN numeros
  ON p.tallas_disponibles IS NOT NULL
 AND numeros.n <= 1 + LENGTH(p.tallas_disponibles) - LENGTH(REPLACE(p.tallas_disponibles, ',', ''))
JOIN tallas t
  ON t.nombre = TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p.tallas_disponibles, ',', numeros.n), ',', -1));

WITH RECURSIVE numeros (n) AS (
    SELECT 1
    UNION ALL
    SELECT n + 1 FROM numeros WHERE n < 50
)
INSERT IGNORE INTO producto_color (producto_id, color_id)
SELECT p.id, c.id
FROM productos p
JOIN numeros
  ON p.colores_disponibles IS NOT NULL
 AND numeros.n <= 1 + LENGTH(p.colores_disponibles) - LENGTH(REPLACE(p.colores_disponibles, ',', ''))
JOIN colores c
  ON c.nombre = TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p.colores_disponibles, ',', numeros.n), ',', -1));

-- 5. Catálogo de estados operativos.
INSERT INTO estados_pedido (nombre, orden)
VALUES
    ('RECIBIDO', 1),
    ('PENDIENTE', 2),
    ('ENVIADO', 3),
    ('ENTREGADO', 4),
    ('CANCELADO', 5)
ON DUPLICATE KEY UPDATE orden = VALUES(orden);

UPDATE pedidos p
JOIN estados_pedido e ON e.nombre = UPPER(TRIM(p.estado))
SET p.estado_id = e.id;

-- 6. Catálogo de métodos de pago de referencia usados por pedidos antiguos.
INSERT INTO metodo_pago (nombre, tipo, activo)
SELECT DISTINCT TRIM(metodo_pago), 'LEGACY', TRUE
FROM pedidos
WHERE metodo_pago IS NOT NULL AND TRIM(metodo_pago) <> ''
ON DUPLICATE KEY UPDATE activo = activo;

UPDATE pedidos p
JOIN metodo_pago m ON m.nombre = TRIM(p.metodo_pago)
SET p.metodo_pago_id = m.id;

-- 7. Direcciones históricas asociadas con el usuario cuando existe usuario_id.
INSERT INTO direcciones_entrega
    (usuario_id, direccion, barrio, ciudad, departamento, referencia)
SELECT DISTINCT
    p.usuario_id,
    TRIM(p.direccion),
    NULLIF(TRIM(p.barrio), ''),
    TRIM(p.ciudad),
    TRIM(p.departamento),
    NULLIF(TRIM(p.referencia), '')
FROM pedidos p
WHERE p.usuario_id IS NOT NULL
  AND p.direccion IS NOT NULL AND TRIM(p.direccion) <> ''
  AND p.ciudad IS NOT NULL AND TRIM(p.ciudad) <> ''
  AND p.departamento IS NOT NULL AND TRIM(p.departamento) <> '';

UPDATE pedidos p
JOIN direcciones_entrega d
  ON d.usuario_id = p.usuario_id
 AND d.direccion = TRIM(p.direccion)
 AND d.ciudad = TRIM(p.ciudad)
 AND d.departamento = TRIM(p.departamento)
 AND COALESCE(d.barrio, '') = COALESCE(NULLIF(TRIM(p.barrio), ''), '')
 AND COALESCE(d.referencia, '') = COALESCE(NULLIF(TRIM(p.referencia), ''), '')
SET p.direccion_id = d.id;

-- 8. Relacionar los detalles heredados con productos, opciones y conservar la
-- instantánea histórica del nombre.
UPDATE detalle_pedido d
JOIN productos p ON p.nombre = TRIM(d.producto)
SET d.producto_id = p.id
WHERE d.producto_id IS NULL;

UPDATE detalle_pedido
SET producto_nombre = TRIM(producto)
WHERE producto_nombre IS NULL AND producto IS NOT NULL;

UPDATE detalle_pedido d
JOIN tallas t ON t.nombre = TRIM(d.talla)
SET d.talla_id = t.id
WHERE d.talla IS NOT NULL AND TRIM(d.talla) <> '';

UPDATE detalle_pedido d
JOIN colores c ON c.nombre = TRIM(d.color)
SET d.color_id = c.id
WHERE d.color IS NOT NULL AND TRIM(d.color) <> '';

-- 9. Crear un registro inicial de historial para cada pedido que pudo ser
-- relacionado con un estado normalizado.
INSERT INTO pedido_historial (pedido_id, estado_id, fecha, usuario_id, observacion)
SELECT p.id, p.estado_id, p.fecha, NULL, 'Migración inicial del estado vigente'
FROM pedidos p
WHERE p.estado_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM pedido_historial h WHERE h.pedido_id = p.id
  );

-- 10. Migrar galería y redes desde los JSON heredados cuando su contenido sea
-- válido. Las nuevas tablas no se relacionan por FK con branding_config,
-- conforme al Excel 3FN.
INSERT INTO branding_galeria (tipo, url, orden, activo)
SELECT COALESCE(NULLIF(LOWER(j.slot), ''),
                CONCAT('gallery', COALESCE(CAST(REGEXP_SUBSTR(j.slot, '[0-9]+') AS UNSIGNED), 0))),
       j.url,
       COALESCE(CAST(REGEXP_SUBSTR(j.slot, '[0-9]+') AS UNSIGNED), 0),
       TRUE
FROM branding_config b
JOIN JSON_TABLE(
    CASE WHEN JSON_VALID(b.gallery_videos_json) THEN b.gallery_videos_json ELSE '[]' END,
    '$[*]' COLUMNS (
        slot VARCHAR(40) PATH '$.slot',
        url VARCHAR(500) PATH '$.url'
    )
) AS j
WHERE j.url IS NOT NULL AND TRIM(j.url) <> '';

INSERT INTO branding_redes (red, url, orden, activo)
SELECT 'tiktok', JSON_UNQUOTE(JSON_EXTRACT(b.social_links_json, '$.tiktok')), 1, TRUE
FROM branding_config b
WHERE JSON_VALID(b.social_links_json)
  AND JSON_UNQUOTE(JSON_EXTRACT(b.social_links_json, '$.tiktok')) IS NOT NULL
  AND JSON_UNQUOTE(JSON_EXTRACT(b.social_links_json, '$.tiktok')) <> ''
UNION ALL
SELECT 'instagram', JSON_UNQUOTE(JSON_EXTRACT(b.social_links_json, '$.instagram')), 2, TRUE
FROM branding_config b
WHERE JSON_VALID(b.social_links_json)
  AND JSON_UNQUOTE(JSON_EXTRACT(b.social_links_json, '$.instagram')) IS NOT NULL
  AND JSON_UNQUOTE(JSON_EXTRACT(b.social_links_json, '$.instagram')) <> ''
UNION ALL
SELECT 'facebook', JSON_UNQUOTE(JSON_EXTRACT(b.social_links_json, '$.facebook')), 3, TRUE
FROM branding_config b
WHERE JSON_VALID(b.social_links_json)
  AND JSON_UNQUOTE(JSON_EXTRACT(b.social_links_json, '$.facebook')) IS NOT NULL
  AND JSON_UNQUOTE(JSON_EXTRACT(b.social_links_json, '$.facebook')) <> '';

-- Este archivo no elimina columnas heredadas ni agrega todavía las
-- restricciones NOT NULL y FK definitivas sobre tablas existentes. Eso debe
-- hacerse después de revisar 03_verify_3fn.sql y actualizar el backend.
