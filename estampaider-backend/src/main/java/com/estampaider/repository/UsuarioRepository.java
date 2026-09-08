package com.estampaider.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.estampaider.model.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByTelefono(String telefono);

    Optional<Usuario> findByUsuario(String usuario);

    List<Usuario> findAllByUsuarioOrTelefono(String usuario, String telefono);

    List<Usuario> findAllByTelefonoOrCorreo(String telefono, String correo);

    boolean existsByUsuario(String usuario);

    boolean existsByTelefono(String telefono);

    Optional<Usuario> findByCorreo(String correo);
}
