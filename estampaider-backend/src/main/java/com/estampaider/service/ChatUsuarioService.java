package com.estampaider.service;

import com.estampaider.model.ChatMensaje;
import com.estampaider.model.Usuario;
import com.estampaider.repository.UsuarioRepository;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;

/** RF-18: relaciona la conversación con una cuenta sin alterar el contrato por teléfono. */
@Service
public class ChatUsuarioService {
    private final UsuarioRepository usuarios;

    public ChatUsuarioService(UsuarioRepository usuarios) { this.usuarios = usuarios; }

    public void asociarCuenta(ChatMensaje mensaje) {
        // No aceptar una asociación enviada por el navegador.
        mensaje.setUsuario(null);
        String telefono = mensaje.getTelefono() == null ? "" : mensaje.getTelefono().replaceAll("\\D", "");
        if (telefono.isBlank()) return;
        Set<String> variantes = telefono.length() == 12 && telefono.startsWith("57")
                ? Set.of(telefono, telefono.substring(2))
                : telefono.length() == 10 ? Set.of(telefono, "57" + telefono) : Set.of(telefono);
        List<Usuario> candidatos = usuarios.findAllByTelefonoIn(variantes);
        if (candidatos.size() == 1) mensaje.setUsuario(candidatos.get(0));
    }
}
