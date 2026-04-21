package com.estampaider.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtFilter extends OncePerRequestFilter {

    @Autowired
    private JwtService jwtService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();

        return path == null
        || HttpMethod.OPTIONS.matches(request.getMethod())
        || path.startsWith("/ws")
        || path.startsWith("/topic")
        || path.startsWith("/app")
        || path.startsWith("/api/auth")
        || path.startsWith("/api/metodos-pago")
        || path.startsWith("/images")
        || path.startsWith("/uploads")
        || path.equals("/webhook")
        || path.equals("/notificar")
        || path.equals("/api/branding/current");
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        try {
            if (jwtService.isTokenValid(token)) {
                String username = jwtService.extractUsername(token);
                String rol = jwtService.extractRol(token);
            
                if (rol == null || rol.isBlank()) {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    return;
                }
            
                String rolNormalizado = rol.trim().toUpperCase();
                if (rolNormalizado.startsWith("ROLE_")) {
                    rolNormalizado = rolNormalizado.substring(5);
                }

                System.out.println("JWT user=" + username + " rolRaw=" + rol + " rolNormalizado=" + rolNormalizado + " path=" + request.getRequestURI());
                UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                        username,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + rolNormalizado))
                    );
            
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        filterChain.doFilter(request, response);
    }
}
