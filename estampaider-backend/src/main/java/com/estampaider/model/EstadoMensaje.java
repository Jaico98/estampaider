package com.estampaider.model;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public class EstadoMensaje {

    private String tipo;
    private String telefono;
    private String actor;
    private Instant fecha;
    private List<String> mensajeIds;

    public EstadoMensaje(String tipo) {
        this(tipo, null);
    }

    public EstadoMensaje(String tipo, String telefono) {
        this(tipo, telefono, null, Instant.now(), List.of());
    }

    public EstadoMensaje(
            String tipo,
            String telefono,
            String actor,
            Instant fecha,
            Collection<String> mensajeIds
    ) {
        this.tipo = tipo;
        this.telefono = telefono;
        this.actor = actor;
        this.fecha = fecha;
        this.mensajeIds = mensajeIds == null ? List.of() : List.copyOf(mensajeIds);
    }

    public String getTipo() {
        return tipo;
    }

    public String getTelefono() {
        return telefono;
    }

    public String getActor() {
        return actor;
    }

    public Instant getFecha() {
        return fecha;
    }

    public List<String> getMensajeIds() {
        return mensajeIds;
    }
}
