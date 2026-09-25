package com.estampaider.config;

import com.estampaider.security.JwtFilter;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    public SecurityConfig(JwtFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // WebSocket público para el flujo actual
                .requestMatchers("/ws/**").permitAll()
                .requestMatchers("/topic/**").permitAll()
                .requestMatchers("/app/**").permitAll()

                // Auth / públicos
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/hello").permitAll()
                .requestMatchers("/api/metodos-pago/**").permitAll()
                .requestMatchers("/images/**").permitAll()
                .requestMatchers("/uploads/**").permitAll()
                .requestMatchers("/notificar").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/branding/current").permitAll()
                .requestMatchers("/error").permitAll()

                // Reseñas
                .requestMatchers(HttpMethod.GET, "/api/resenas").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/resenas").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/resenas/admin").authenticated()
                .requestMatchers(HttpMethod.PUT, "/api/resenas/**").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/resenas/**").authenticated()

                // Branding admin
                // Branding admin
                .requestMatchers(HttpMethod.POST, "/api/branding/gallery-video").hasAuthority("ROLE_ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/branding/gallery-video").hasAuthority("ROLE_ADMIN")
                
                .requestMatchers(HttpMethod.POST, "/api/branding/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/branding/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/branding/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/branding/**").hasAuthority("ROLE_ADMIN")

                // Pedidos
                .requestMatchers(HttpMethod.POST, "/api/pedidos/**").hasAnyRole("CLIENTE", "ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/pedidos/mis-pedidos").hasAnyRole("CLIENTE", "ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/pedidos/cliente/**").hasAnyRole("CLIENTE", "ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/pedidos").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/pedidos/stats").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/pedidos/estado/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/pedidos/*").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/pedidos/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/pedidos/**").hasRole("ADMIN")

                .requestMatchers(HttpMethod.PUT, "/api/usuarios/cambiar-password").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/branding/gallery-video").hasRole("ADMIN")
                .requestMatchers("/api/branding/**").hasRole("ADMIN")

                // Mensajes del panel admin
                .requestMatchers(HttpMethod.POST, "/api/mensajes").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/mensajes").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/mensajes/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/mensajes/**").hasRole("ADMIN")

                // Chat REST
                .requestMatchers(HttpMethod.GET, "/api/chat/**").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/chat/**").hasRole("ADMIN")

                // Productos
                .requestMatchers(HttpMethod.POST, "/api/uploads/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/productos/admin/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/productos/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/productos/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/productos/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/productos/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/productos/**").hasRole("ADMIN")

                .anyRequest().authenticated()
            )
            .exceptionHandling(ex -> ex
                    .accessDeniedHandler((request, response, accessDeniedException) ->
                            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Forbidden")))

            .addFilterBefore(jwtFilter, org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
