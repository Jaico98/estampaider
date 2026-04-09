package com.estampaider.model;

public class EstadoMensaje {

    private String tipo;
    private String telefono;

    public EstadoMensaje(String tipo) {
        this.tipo = tipo;
    }

    public EstadoMensaje(String tipo, String telefono) {
        this.tipo = tipo;
        this.telefono = telefono;
    }

    public String getTipo() {
        return tipo;
    }

    public String getTelefono() {
        return telefono;
    }
}
