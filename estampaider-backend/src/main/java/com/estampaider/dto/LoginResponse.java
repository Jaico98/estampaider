package com.estampaider.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class LoginResponse {
    private boolean ok;
    private String rol;
    private String nombre;
    private String correo;
    private String token;
    private String telefono;

    public LoginResponse(
            boolean ok,
            String rol,
            String nombre,
            String correo,
            String telefono,
            String token
    ) {
        this.ok = ok;
        this.rol = rol;
        this.nombre = nombre;
        this.correo = correo;
        this.telefono = telefono;
        this.token = token;
    }

    public boolean isOk() {
        return ok;
    }

    public String getRol() {
        return rol;
    }

    public String getNombre() {
        return nombre;
    }

    public String getCorreo() {
        return correo;
    }

    @JsonProperty("telefono")
    public String getTelefono() {
        return telefono;
    }

    public String getToken() {
        return token;
    }
}


