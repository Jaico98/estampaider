package com.estampaider.model;

import jakarta.persistence.*;

@Entity
@Table(name = "branding_config")
public class BrandingConfig {

    @Id
    private Long id = 1L;

    @Column(length = 500)
    private String logoUrl = "";

    @Column(length = 500)
    private String faviconUrl = "";

    @Column(length = 500)
    private String heroBackgroundUrl = "";

    @Column(length = 500)
    private String heroMainVideoUrl = "";

    @Column(length = 500)
    private String highlightVideoUrl = "";

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }

    public String getFaviconUrl() { return faviconUrl; }
    public void setFaviconUrl(String faviconUrl) { this.faviconUrl = faviconUrl; }

    public String getHeroBackgroundUrl() { return heroBackgroundUrl; }
    public void setHeroBackgroundUrl(String heroBackgroundUrl) { this.heroBackgroundUrl = heroBackgroundUrl; }

    public String getHeroMainVideoUrl() { return heroMainVideoUrl; }
    public void setHeroMainVideoUrl(String heroMainVideoUrl) { this.heroMainVideoUrl = heroMainVideoUrl; }

    public String getHighlightVideoUrl() { return highlightVideoUrl; }
    public void setHighlightVideoUrl(String highlightVideoUrl) { this.highlightVideoUrl = highlightVideoUrl; }

}
