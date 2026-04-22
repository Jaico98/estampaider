package com.estampaider.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.estampaider.model.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByTelefono(String telefono);

    Optional<Usuario> findByUsuario(String usuario);

    boolean existsByUsuario(String usuario);

    boolean existsByTelefono(String telefono);

    Optional<Usuario> findByResetToken(String token);

    Optional<Usuario> findByCorreo(String correo);
}