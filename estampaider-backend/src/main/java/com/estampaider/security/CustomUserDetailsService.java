package com.estampaider.security;

import com.estampaider.model.Usuario;
import com.estampaider.repository.UsuarioRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Override
    public UserDetails loadUserByUsername(String username)
            throws UsernameNotFoundException {

        Usuario usuario = usuarioRepository.findByTelefono(username)
                .orElseThrow(() ->
                        new UsernameNotFoundException("Usuario no encontrado"));

                        return org.springframework.security.core.userdetails.User
                        .withUsername(usuario.getTelefono())
                        .password(usuario.getPassword())
                        .roles(usuario.getRol().name())
                        .build();
    }
}
