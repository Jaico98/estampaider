package com.estampaider.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import com.estampaider.security.JwtFilter;
import org.springframework.security.config.http.SessionCreationPolicy;
import java.util.List;

@Configuration
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    public SecurityConfig(JwtFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        http
        .cors(cors -> cors.configurationSource(request -> {
            CorsConfiguration config = new CorsConfiguration();
        
            config.setAllowedOriginPatterns(List.of(
                "http://localhost:5501",
                "http://127.0.0.1:5501"
            ));
    
        
            config.setAllowedMethods(List.of(
                "GET", "POST", "PUT", "DELETE", "OPTIONS"
            ));
        
            config.setAllowedHeaders(List.of("*"));
            config.setExposedHeaders(List.of("*"));
            config.setAllowCredentials(true);
        
            return config;
        }))              
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)    )
            .authorizeHttpRequests(auth -> auth

                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                .requestMatchers("/ws/**").permitAll() // 🔥 PERMITIR WEBSOCKET
                // Públicos
                .requestMatchers("/topic/**").permitAll()
                .requestMatchers("/app/**").permitAll()
                .requestMatchers("/api/chat/**").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/productos/**").permitAll()
                .requestMatchers("/api/metodos-pago/**").permitAll()
                .requestMatchers("/images/**").permitAll()
                .requestMatchers("/webhook").permitAll()
                .requestMatchers("/notificar").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/pedidos/**").hasAnyRole("CLIENTE", "ADMIN")

                // Cliente puede ver sus pedidos
                .requestMatchers(HttpMethod.GET, "/api/pedidos/mis-pedidos").hasAnyRole("CLIENTE", "ADMIN")
                .requestMatchers("/api/pedidos/cliente/**").hasAnyRole("CLIENTE", "ADMIN")

                // Permitir enviar mensajes SIN login
                .requestMatchers(HttpMethod.POST, "/api/mensajes").permitAll()

                // Solo admin puede ver, eliminar, etc
                .requestMatchers(HttpMethod.GET, "/api/mensajes").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/mensajes/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/mensajes/**").hasRole("ADMIN")

                // Solo ADMIN (excepto crear pedido)
                .requestMatchers(HttpMethod.GET, "/api/pedidos").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/pedidos/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/pedidos/**").hasRole("ADMIN")

                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter,
                org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}

