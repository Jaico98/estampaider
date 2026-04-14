package com.estampaider.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "resenas")
public class Resena {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false, length = 1200)
    private String comentario;

    @Column(nullable = false)
    private int estrellas;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @Column(length = 1200)
    private String respuestaAdmin;

    private LocalDateTime fechaRespuestaAdmin;

    public Resena() {
        this.fecha = LocalDateTime.now();
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

    public String getComentario() {
        return comentario;
    }

    public void setComentario(String comentario) {
        this.comentario = comentario;
    }

    public int getEstrellas() {
        return estrellas;
    }

    public void setEstrellas(int estrellas) {
        this.estrellas = estrellas;
    }

    public LocalDateTime getFecha() {
        return fecha;
    }

    public void setFecha(LocalDateTime fecha) {
        this.fecha = fecha;
    }

    public String getRespuestaAdmin() {
        return respuestaAdmin;
    }

    public void setRespuestaAdmin(String respuestaAdmin) {
        this.respuestaAdmin = respuestaAdmin;
    }

    public LocalDateTime getFechaRespuestaAdmin() {
        return fechaRespuestaAdmin;
    }

    public void setFechaRespuestaAdmin(LocalDateTime fechaRespuestaAdmin) {
        this.fechaRespuestaAdmin = fechaRespuestaAdmin;
    }
}