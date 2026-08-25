package com.estampaider.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "branding_redes")
public class BrandingRed {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 40)
    private String red;

    @Column(nullable = false, length = 500)
    private String url;

    @Column(nullable = false)
    private Integer orden;

    @Column(nullable = false)
    private boolean activo = true;

    public Long getId() { return id; }
    public String getRed() { return red; }
    public void setRed(String red) { this.red = red; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public Integer getOrden() { return orden; }
    public void setOrden(Integer orden) { this.orden = orden; }
    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }
}
