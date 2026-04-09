package com.estampaider.service;

import org.springframework.stereotype.Service;

@Service
public class OpenAIService {

    public String preguntar(String mensaje){

        return "🤖 *Asistente Estampaider*\n\n" +
               "Gracias por tu mensaje.\n\n" +
               "Un asesor responderá pronto o puedes escribir *menu* para ver las opciones.";

    }
}