package com.estampaider.model;

import jakarta.persistence.*;

@Entity
@Table(name = "productos")
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false)
    private String imagenUrl;

    @Column(nullable = false)
    private double precio;

    @Column(length = 1000)
    private String descripcion;

    @Column(length = 100)
    private String categoria;

    @Column(nullable = false)
    private boolean activo = true;

    @Column(length = 30)
    private String etiqueta;

    @Column(nullable = false)
    private Integer orden = 0;

    @Column(length = 255)
    private String tallasDisponibles;

    @Column(length = 255)
    private String coloresDisponibles;

    public Producto() {
    }

    public Producto(String nombre, String imagenUrl, double precio) {
        this.nombre = nombre;
        this.imagenUrl = imagenUrl;
        this.precio = precio;
        this.activo = true;
        this.orden = 0;
    }

    public Producto(String nombre, String imagenUrl, double precio, String descripcion, String categoria) {
        this.nombre = nombre;
        this.imagenUrl = imagenUrl;
        this.precio = precio;
        this.descripcion = descripcion;
        this.categoria = categoria;
        this.activo = true;
        this.orden = 0;
    }

    public Long getId() {
        return id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getImagenUrl() {
        return imagenUrl;
    }

    public void setImagenUrl(String imagenUrl) {
        this.imagenUrl = imagenUrl;
    }

    public double getPrecio() {
        return precio;
    }

    public void setPrecio(double precio) {
        this.precio = precio;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public String getCategoria() {
        return categoria;
    }

    public void setCategoria(String categoria) {
        this.categoria = categoria;
    }

    public boolean isActivo() {
        return activo;
    }

    public void setActivo(boolean activo) {
        this.activo = activo;
    }

    public String getEtiqueta() {
        return etiqueta;
    }

    public void setEtiqueta(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public Integer getOrden() {
        return orden;
    }

    public void setOrden(Integer orden) {
        this.orden = orden;
    }

    public String getTallasDisponibles() {
        return tallasDisponibles;
    }

    public void setTallasDisponibles(String tallasDisponibles) {
        this.tallasDisponibles = tallasDisponibles;
    }

    public String getColoresDisponibles() {
        return coloresDisponibles;
    }

    public void setColoresDisponibles(String coloresDisponibles) {
        this.coloresDisponibles = coloresDisponibles;
    }
}