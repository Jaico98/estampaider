package com.estampaider.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

@Service
public class JwtService {

    private static final int MINIMUM_SECRET_BYTES = 32;

    @Value("${app.jwt.secret:}")
    private String secret;

    @Value("${jwt.expiration:14400000}")
    private long expirationMilliseconds;

    @PostConstruct
    void validateConfiguration() {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET debe configurarse como variable de entorno antes de iniciar el backend");
        }

        if (secret.getBytes(StandardCharsets.UTF_8).length < MINIMUM_SECRET_BYTES) {
            throw new IllegalStateException("JWT_SECRET debe tener al menos 32 bytes UTF-8");
        }

        if (expirationMilliseconds <= 0) {
            throw new IllegalStateException("JWT_EXPIRATION debe ser un número positivo de milisegundos");
        }
    }

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(String username, String rol) {

        return Jwts.builder()
                .setSubject(username)
                .claim("rol", rol)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationMilliseconds))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    public String extractRol(String token) {
        return extractAllClaims(token).get("rol", String.class);
    }

    public boolean isTokenValid(String token) {
        return extractAllClaims(token).getExpiration().after(new Date());
    }
}

