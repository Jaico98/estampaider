package com.estampaider.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class Cotizacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String telefono;
    private String producto;
    private String cantidad;
    private String estampado;
    private LocalDateTime fecha;
    private double precio;
    private double total;

    public Cotizacion() {
        this.fecha = LocalDateTime.now();
    }

    // Getters y Setters
    public Long getId() { return id; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }

    public String getProducto() { return producto; }
    public void setProducto(String producto) { this.producto = producto; }

    public String getCantidad() { return cantidad; }
    public void setCantidad(String cantidad) { this.cantidad = cantidad; }

    public String getEstampado() { return estampado; }
    public void setEstampado(String estampado) { this.estampado = estampado; }

    public LocalDateTime getFecha() { return fecha; }

    public void setFecha(LocalDateTime fecha) {
        this.fecha = fecha;
    }

    public double getPrecio() {
        return precio;
    }

    public void setPrecio(double precio) {
        this.precio = precio;
    }

    public double getTotal() {
        return total;
    }
    
    public void setTotal(double total) {
        this.total = total;
    }
}