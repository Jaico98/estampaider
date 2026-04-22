package com.estampaider.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.Instant;

@Entity
public class ChatMensaje {

    @Id
    private String id;

    private String nombre;
    private String correo;

    @Column(columnDefinition = "TEXT")
    private String mensaje;

    private String telefono;
    private String tipo;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Instant fecha;

    @PrePersist
    public void prePersist() {
        this.fecha = Instant.now();
    }

    private boolean leido = false;
    private boolean recibido;

    public String getId() {
        return id;
    }

    public String getNombre() {
        return nombre;
    }

    public String getCorreo() {
        return correo;
    }

    public String getMensaje() {
        return mensaje;
    }

    public String getTelefono() {
        return telefono;
    }

    public String getTipo() {
        return tipo;
    }

    public Instant getFecha() {
        return fecha;
    }

    public boolean isLeido() {
        return leido;
    }

    public boolean isRecibido() {
        return recibido;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public void setCorreo(String correo) {
        this.correo = correo;
    }

    public void setMensaje(String mensaje) {
        this.mensaje = mensaje;
    }

    public void setTelefono(String telefono) {
        this.telefono = telefono;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public void setFecha(Instant fecha) {
        this.fecha = fecha;
    }

    public void setLeido(boolean leido) {
        this.leido = leido;
    }

    public void setRecibido(boolean recibido) {
        this.recibido = recibido;
    }
}