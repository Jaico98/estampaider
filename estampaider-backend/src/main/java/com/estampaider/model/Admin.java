package com.estampaider.model;

import jakarta.persistence.*;

@Entity
@Table(name = "admin")
public class Admin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String usuario;

    private String password;

    // getters y setters
    public Long getId() { return id; }
    public String getUsuario() { return usuario; }
    public String getPassword() { return password; }

    public void setId(Long id) { this.id = id; }
    public void setUsuario(String usuario) { this.usuario = usuario; }
    public void setPassword(String password) { this.password = password; }
}
