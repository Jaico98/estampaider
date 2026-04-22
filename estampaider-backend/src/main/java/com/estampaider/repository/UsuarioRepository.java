package com.estampaider.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.estampaider.model.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    /**
     * Buscar usuario por teléfono
     * Usado para:
     * - Login de clientes
     * - Asociar pedidos a usuarios existentes
     */
    Optional<Usuario> findByTelefono(String telefono);

    boolean existsByTelefono(String telefono);

    Optional<Usuario> findByResetToken(String token);

    Optional<Usuario> findByCorreo(String correo);
    
}
