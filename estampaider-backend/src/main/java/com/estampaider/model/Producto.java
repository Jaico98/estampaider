package com.estampaider.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Entity
@Table(name = "productos")
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String nombre;

    @Column(length = 1000)
    private String descripcion;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal precio;

    @Column(name = "imagen_url", length = 500)
    private String imagenUrl;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "categoria_id", nullable = false)
    @JsonIgnore
    private Categoria categoriaEntidad;

    @Column(length = 30)
    private String etiqueta;

    @Column(nullable = false)
    private boolean activo = true;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "producto_talla",
        joinColumns = @JoinColumn(name = "producto_id"),
        inverseJoinColumns = @JoinColumn(name = "talla_id")
    )
    @JsonIgnore
    private Set<Talla> tallas = new LinkedHashSet<>();

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "producto_color",
        joinColumns = @JoinColumn(name = "producto_id"),
        inverseJoinColumns = @JoinColumn(name = "color_id")
    )
    @JsonIgnore
    private Set<Color> colores = new LinkedHashSet<>();

    /* Campos transitorios de compatibilidad con el contrato JSON anterior. */
    @Transient
    private String categoria;

    @Transient
    private String tallasDisponibles;

    @Transient
    private String coloresDisponibles;

    @Transient
    private Integer orden;

    public Producto() {
    }

    public Producto(String nombre, String imagenUrl, double precio) {
        this.nombre = nombre;
        this.imagenUrl = imagenUrl;
        this.precio = BigDecimal.valueOf(precio);
        this.activo = true;
    }

    public Producto(String nombre, String imagenUrl, double precio, String descripcion, String categoria) {
        this(nombre, imagenUrl, precio);
        this.descripcion = descripcion;
        this.categoria = categoria;
    }

    public Long getId() { return id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getImagenUrl() { return imagenUrl; }
    public void setImagenUrl(String imagenUrl) { this.imagenUrl = imagenUrl; }

    public double getPrecio() {
        return precio == null ? 0D : precio.doubleValue();
    }

    public void setPrecio(double precio) {
        this.precio = BigDecimal.valueOf(precio);
    }

    @JsonIgnore
    public BigDecimal getPrecioDecimal() { return precio; }

    public void setPrecioDecimal(BigDecimal precio) { this.precio = precio; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public String getCategoria() {
        return categoriaEntidad != null ? categoriaEntidad.getNombre() : categoria;
    }

    public void setCategoria(String categoria) { this.categoria = categoria; }

    @JsonIgnore
    public Categoria getCategoriaEntidad() { return categoriaEntidad; }

    public void setCategoriaEntidad(Categoria categoriaEntidad) {
        this.categoriaEntidad = categoriaEntidad;
        this.categoria = categoriaEntidad == null ? null : categoriaEntidad.getNombre();
    }

    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }
    public String getEtiqueta() { return etiqueta; }
    public void setEtiqueta(String etiqueta) { this.etiqueta = etiqueta; }

    public String getTallasDisponibles() {
        if (tallas != null && !tallas.isEmpty()) {
            return tallas.stream().map(Talla::getNombre).collect(Collectors.joining(","));
        }
        return tallasDisponibles;
    }

    public void setTallasDisponibles(String tallasDisponibles) {
        this.tallasDisponibles = tallasDisponibles;
    }

    public String getColoresDisponibles() {
        if (colores != null && !colores.isEmpty()) {
            return colores.stream().map(Color::getNombre).collect(Collectors.joining(","));
        }
        return coloresDisponibles;
    }

    public void setColoresDisponibles(String coloresDisponibles) {
        this.coloresDisponibles = coloresDisponibles;
    }

    @JsonIgnore
    public Set<Talla> getTallas() { return tallas; }
    public void setTallas(Set<Talla> tallas) { this.tallas = tallas == null ? new LinkedHashSet<>() : tallas; }

    @JsonIgnore
    public Set<Color> getColores() { return colores; }
    public void setColores(Set<Color> colores) { this.colores = colores == null ? new LinkedHashSet<>() : colores; }

    /** Compatibilidad temporal con el endpoint antiguo de ordenación. */
    public Integer getOrden() { return orden; }
    public void setOrden(Integer orden) { this.orden = orden; }
}
