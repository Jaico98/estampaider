package com.estampaider.config;

import com.estampaider.security.JwtFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;

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
                        "http://127.0.0.1:5501",
                        "http://localhost:*",
                        "http://127.0.0.1:*"
                ));
                config.setAllowedMethods(List.of(
                        "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"
                ));
                config.setAllowedHeaders(List.of("*"));
                config.setExposedHeaders(List.of("*"));
                config.setAllowCredentials(true);
                return config;
            }))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authorizeHttpRequests(auth -> auth
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                    .requestMatchers("/ws/**").permitAll()
                    .requestMatchers("/topic/**").permitAll()
                    .requestMatchers("/app/**").permitAll()

                    .requestMatchers("/api/auth/**").permitAll()
                    .requestMatchers("/api/metodos-pago/**").permitAll()
                    .requestMatchers("/images/**").permitAll()
                    .requestMatchers("/uploads/**").permitAll()
                    .requestMatchers("/webhook").permitAll()
                    .requestMatchers("/notificar").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/branding/current").permitAll()

                    // Reseñas
                    .requestMatchers(HttpMethod.GET, "/api/resenas").permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/resenas").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/resenas/admin").authenticated()
                    .requestMatchers(HttpMethod.PUT, "/api/resenas/**").authenticated()
                    .requestMatchers(HttpMethod.DELETE, "/api/resenas/**").authenticated()

                    .requestMatchers(HttpMethod.POST, "/api/pedidos/**").hasAnyRole("CLIENTE", "ADMIN")
                    .requestMatchers(HttpMethod.GET, "/api/pedidos/mis-pedidos").hasAnyRole("CLIENTE", "ADMIN")
                    .requestMatchers(HttpMethod.GET, "/api/pedidos/cliente/**").hasAnyRole("CLIENTE", "ADMIN")
                    .requestMatchers(HttpMethod.PUT, "/api/productos/admin/**").hasRole("ADMIN")

                    .requestMatchers(HttpMethod.GET, "/api/pedidos").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.GET, "/api/pedidos/stats").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.GET, "/api/pedidos/cotizaciones").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.GET, "/api/pedidos/estado/**").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.GET, "/api/pedidos/*").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.PUT, "/api/pedidos/**").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.DELETE, "/api/pedidos/**").hasRole("ADMIN")

                    .requestMatchers(HttpMethod.PUT, "/api/usuarios/cambiar-password").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.POST, "/api/branding/**").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.PUT, "/api/branding/**").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.DELETE, "/api/branding/**").hasRole("ADMIN")

                    .requestMatchers(HttpMethod.POST, "/api/mensajes").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/mensajes").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.PUT, "/api/mensajes/**").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.DELETE, "/api/mensajes/**").hasRole("ADMIN")

                    .requestMatchers(HttpMethod.GET, "/api/chat/**").permitAll()
                    .requestMatchers(HttpMethod.DELETE, "/api/chat/**").hasRole("ADMIN")

                    .requestMatchers(HttpMethod.POST, "/api/uploads/**").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.GET, "/api/productos/admin/**").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.GET, "/api/productos/**").permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/productos/**").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.PUT, "/api/productos/**").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.PATCH, "/api/productos/**").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.DELETE, "/api/productos/**").hasRole("ADMIN")

                    .anyRequest().authenticated()
            )
            .addFilterBefore(
                    jwtFilter,
                    org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }
}
