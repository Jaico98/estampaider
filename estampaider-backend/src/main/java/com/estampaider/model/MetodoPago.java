package com.estampaider.model;

import jakarta.persistence.*;

@Entity
@Table(name = "metodo_pago")
public class MetodoPago {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 60)
    private String nombre;       // NEQUI, PRESENCIAL, QR
    @Column(length = 40)
    private String tipo;         // TRANSFERENCIA, PRESENCIAL, QR
    @Column(length = 200)
    private String descripcion;  // Texto para el cliente
    @Column(length = 120)
    private String dato;         // Teléfono, dirección o ruta QR
    @Column(nullable = false)
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
