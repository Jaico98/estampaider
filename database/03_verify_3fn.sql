-- Estampaider - verificaciones posteriores a la migración 3FN
-- Ejecutar después de 01_schema_3fn.sql y 02_migrate_legacy_to_3fn.sql.

SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN (
      'categorias', 'productos', 'tallas', 'colores', 'producto_talla',
      'producto_color', 'usuarios', 'direcciones_entrega', 'metodo_pago',
      'estados_pedido', 'pedidos', 'detalle_pedido', 'pedido_historial',
      'mensajes', 'resenas', 'branding_config', 'branding_galeria',
      'branding_redes'
  )
ORDER BY FIELD(
    table_name,
    'categorias', 'productos', 'tallas', 'colores', 'producto_talla',
    'producto_color', 'usuarios', 'direcciones_entrega', 'metodo_pago',
    'estados_pedido', 'pedidos', 'detalle_pedido', 'pedido_historial',
    'mensajes', 'resenas', 'branding_config', 'branding_galeria',
    'branding_redes'
  );

SELECT 'categorias' AS tabla, COUNT(*) AS registros FROM categorias
UNION ALL SELECT 'productos', COUNT(*) FROM productos
UNION ALL SELECT 'tallas', COUNT(*) FROM tallas
UNION ALL SELECT 'colores', COUNT(*) FROM colores
UNION ALL SELECT 'producto_talla', COUNT(*) FROM producto_talla
UNION ALL SELECT 'producto_color', COUNT(*) FROM producto_color
UNION ALL SELECT 'usuarios', COUNT(*) FROM usuarios
UNION ALL SELECT 'direcciones_entrega', COUNT(*) FROM direcciones_entrega
UNION ALL SELECT 'metodo_pago', COUNT(*) FROM metodo_pago
UNION ALL SELECT 'estados_pedido', COUNT(*) FROM estados_pedido
UNION ALL SELECT 'pedidos', COUNT(*) FROM pedidos
UNION ALL SELECT 'detalle_pedido', COUNT(*) FROM detalle_pedido
UNION ALL SELECT 'pedido_historial', COUNT(*) FROM pedido_historial
UNION ALL SELECT 'mensajes', COUNT(*) FROM mensajes
UNION ALL SELECT 'resenas', COUNT(*) FROM resenas
UNION ALL SELECT 'branding_config', COUNT(*) FROM branding_config
UNION ALL SELECT 'branding_galeria', COUNT(*) FROM branding_galeria
UNION ALL SELECT 'branding_redes', COUNT(*) FROM branding_redes;

SELECT 'productos_sin_categoria' AS verificacion, COUNT(*) AS casos
FROM productos WHERE categoria_id IS NULL;

SELECT 'pedidos_sin_usuario' AS verificacion, COUNT(*) AS casos
FROM pedidos WHERE usuario_id IS NULL;

SELECT 'pedidos_sin_estado_normalizado' AS verificacion, COUNT(*) AS casos
FROM pedidos WHERE estado_id IS NULL;

SELECT 'detalles_sin_producto_normalizado' AS verificacion, COUNT(*) AS casos
FROM detalle_pedido WHERE producto_id IS NULL;

SELECT 'detalles_sin_nombre_historico' AS verificacion, COUNT(*) AS casos
FROM detalle_pedido WHERE producto_nombre IS NULL OR TRIM(producto_nombre) = '';

SELECT 'pedidos_sin_direccion_relacionada' AS verificacion, COUNT(*) AS casos
FROM pedidos
WHERE direccion_id IS NULL;

SELECT 'usuarios_sin_password_hash' AS verificacion, COUNT(*) AS casos
FROM usuarios
WHERE password_hash IS NULL OR TRIM(password_hash) = '';

SELECT 'estados_no_catalogados' AS verificacion, COUNT(*) AS casos
FROM pedidos
WHERE estado_id IS NULL;

SELECT 'tablas_branding_sin_fk_entre_ellas' AS verificacion,
       COUNT(*) AS relaciones_declaradas
FROM information_schema.key_column_usage
WHERE table_schema = DATABASE()
  AND table_name IN ('branding_config', 'branding_galeria', 'branding_redes')
  AND referenced_table_name IS NOT NULL;
