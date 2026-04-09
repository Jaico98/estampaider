package com.estampaider.model;

import jakarta.persistence.*;

@Entity
public class MetodoPago {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nombre;       // NEQUI, PRESENCIAL, QR
    private String tipo;         // TRANSFERENCIA, PRESENCIAL, QR
    private String descripcion;  // Texto para el cliente
    private String dato;         // Teléfono, dirección o ruta QR
    private boolean activo = true;

    public MetodoPago() {}

    public MetodoPago(String nombre, String tipo, String descripcion, String dato) {
        this.nombre = nombre;
        this.tipo = tipo;
        this.descripcion = descripcion;
        this.dato = dato;
    }

    public Long getId() { return id; }
    public String getNombre() { return nombre; }
    public String getTipo() { return tipo; }
    public String getDescripcion() { return descripcion; }
    public String getDato() { return dato; }
    public boolean isActivo() { return activo; }

    public void setId(Long id) { this.id = id; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public void setDato(String dato) { this.dato = dato; }
    public void setActivo(boolean activo) { this.activo = activo; }
}
