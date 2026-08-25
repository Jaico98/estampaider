-- Estampaider - esquema relacional objetivo en tercera forma normal
-- Este archivo crea el esquema objetivo en una base de datos nueva.
-- No debe ejecutarse sobre producción sin respaldo y sin validar la migración.
--
-- Decisión documentada: usuarios.usuario es opcional y único cuando existe,
-- porque el registro público actual utiliza nombre, teléfono, correo y contraseña.

CREATE TABLE IF NOT EXISTS categorias (
    id BIGINT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(80) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    UNIQUE KEY uq_categorias_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tallas (
    id BIGINT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(20) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tallas_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS colores (
    id BIGINT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(40) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_colores_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usuarios (
    id BIGINT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(120) NOT NULL,
    usuario VARCHAR(50) NULL,
    correo VARCHAR(160) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('CLIENTE', 'ADMINISTRADOR') NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_usuarios_usuario (usuario),
    UNIQUE KEY uq_usuarios_correo (correo),
    UNIQUE KEY uq_usuarios_telefono (telefono)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS direcciones_entrega (
    id BIGINT NOT NULL AUTO_INCREMENT,
    usuario_id BIGINT NOT NULL,
    direccion VARCHAR(200) NOT NULL,
    barrio VARCHAR(80) NULL,
    ciudad VARCHAR(80) NOT NULL,
    departamento VARCHAR(80) NOT NULL,
    referencia VARCHAR(200) NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_direcciones_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS metodo_pago (
    id BIGINT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(60) NOT NULL,
    tipo VARCHAR(40) NULL,
    descripcion VARCHAR(200) NULL,
    dato VARCHAR(120) NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    UNIQUE KEY uq_metodo_pago_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS estados_pedido (
    id BIGINT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(40) NOT NULL,
    orden INT NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_estados_pedido_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS productos (
    id BIGINT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(120) NOT NULL,
    descripcion VARCHAR(1000) NULL,
    precio DECIMAL(12,2) NOT NULL,
    imagen_url VARCHAR(500) NULL,
    categoria_id BIGINT NOT NULL,
    etiqueta VARCHAR(30) NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    CONSTRAINT fk_productos_categoria
        FOREIGN KEY (categoria_id) REFERENCES categorias (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS producto_talla (
    producto_id BIGINT NOT NULL,
    talla_id BIGINT NOT NULL,
    PRIMARY KEY (producto_id, talla_id),
    CONSTRAINT fk_producto_talla_producto
        FOREIGN KEY (producto_id) REFERENCES productos (id),
    CONSTRAINT fk_producto_talla_talla
        FOREIGN KEY (talla_id) REFERENCES tallas (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS producto_color (
    producto_id BIGINT NOT NULL,
    color_id BIGINT NOT NULL,
    PRIMARY KEY (producto_id, color_id),
    CONSTRAINT fk_producto_color_producto
        FOREIGN KEY (producto_id) REFERENCES productos (id),
    CONSTRAINT fk_producto_color_color
        FOREIGN KEY (color_id) REFERENCES colores (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pedidos (
    id BIGINT NOT NULL AUTO_INCREMENT,
    usuario_id BIGINT NOT NULL,
    direccion_id BIGINT NULL,
    metodo_pago_id BIGINT NULL,
    estado_id BIGINT NOT NULL,
    estado_pago VARCHAR(40) NULL,
    fecha DATETIME NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_pedidos_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
    CONSTRAINT fk_pedidos_direccion
        FOREIGN KEY (direccion_id) REFERENCES direcciones_entrega (id),
    CONSTRAINT fk_pedidos_metodo_pago
        FOREIGN KEY (metodo_pago_id) REFERENCES metodo_pago (id),
    CONSTRAINT fk_pedidos_estado
        FOREIGN KEY (estado_id) REFERENCES estados_pedido (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS detalle_pedido (
    id BIGINT NOT NULL AUTO_INCREMENT,
    pedido_id BIGINT NOT NULL,
    producto_id BIGINT NOT NULL,
    producto_nombre VARCHAR(120) NOT NULL,
    precio_unitario DECIMAL(12,2) NOT NULL,
    cantidad INT NOT NULL,
    talla_id BIGINT NULL,
    color_id BIGINT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_detalle_pedido_pedido
        FOREIGN KEY (pedido_id) REFERENCES pedidos (id),
    CONSTRAINT fk_detalle_pedido_producto
        FOREIGN KEY (producto_id) REFERENCES productos (id),
    CONSTRAINT fk_detalle_pedido_talla
        FOREIGN KEY (talla_id) REFERENCES tallas (id),
    CONSTRAINT fk_detalle_pedido_color
        FOREIGN KEY (color_id) REFERENCES colores (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pedido_historial (
    id BIGINT NOT NULL AUTO_INCREMENT,
    pedido_id BIGINT NOT NULL,
    estado_id BIGINT NOT NULL,
    fecha DATETIME NOT NULL,
    usuario_id BIGINT NULL,
    observacion VARCHAR(300) NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_historial_pedido
        FOREIGN KEY (pedido_id) REFERENCES pedidos (id),
    CONSTRAINT fk_historial_estado
        FOREIGN KEY (estado_id) REFERENCES estados_pedido (id),
    CONSTRAINT fk_historial_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mensajes (
    id BIGINT NOT NULL AUTO_INCREMENT,
    usuario_id BIGINT NULL,
    nombre VARCHAR(120) NOT NULL,
    correo VARCHAR(160) NULL,
    whatsapp VARCHAR(25) NULL,
    mensaje TEXT NOT NULL,
    fecha DATETIME NOT NULL,
    leido BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (id),
    CONSTRAINT fk_mensajes_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS resenas (
    id BIGINT NOT NULL AUTO_INCREMENT,
    usuario_id BIGINT NULL,
    nombre VARCHAR(120) NOT NULL,
    comentario VARCHAR(1200) NOT NULL,
    estrellas INT NOT NULL,
    fecha DATETIME NOT NULL,
    respuesta_admin VARCHAR(1200) NULL,
    fecha_respuesta_admin DATETIME NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_resenas_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS branding_config (
    id BIGINT NOT NULL,
    logo_url VARCHAR(500) NULL,
    favicon_url VARCHAR(500) NULL,
    hero_background_url VARCHAR(500) NULL,
    hero_main_video_url VARCHAR(500) NULL,
    highlight_video_url VARCHAR(500) NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS branding_galeria (
    id BIGINT NOT NULL AUTO_INCREMENT,
    tipo VARCHAR(20) NOT NULL,
    url VARCHAR(500) NOT NULL,
    orden INT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS branding_redes (
    id BIGINT NOT NULL AUTO_INCREMENT,
    red VARCHAR(40) NOT NULL,
    url VARCHAR(500) NOT NULL,
    orden INT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
