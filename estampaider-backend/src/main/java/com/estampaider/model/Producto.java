package com.estampaider.model;
import com.fasterxml.jackson.annotation.JsonProperty;
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
    private String imagenUrl;   // ✅ ahora sí es imagen

    @Column(nullable = false)
    private double precio;

    public Producto() {}

    public Producto(String nombre, String imagenUrl, double precio) {
        this.nombre = nombre;
        this.imagenUrl = imagenUrl;
        this.precio = precio;
    }
    /* ===================== GETTERS Y SETTERS ===================== */

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
}
