package com.estampaider;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:order_test;MODE=MySQL;DB_CLOSE_DELAY=-1")
@ActiveProfiles("test")
@AutoConfigureMockMvc
class FreshSchemaOrderTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;

    @Test void registerLoginCreateAndReadOrder() throws Exception {
        assertEquals(19, jdbc.queryForObject("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='PUBLIC'", Integer.class));
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
            {"nombre":"Cliente prueba","telefono":"3001112233","correo":"prueba@example.test","password":"test-only-password"}
            """)).andExpect(status().isOk());
        String login = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content("{\"usuario\":\"3001112233\",\"password\":\"test-only-password\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String token = json.readTree(login).get("token").asText();
        mvc.perform(get("/api/productos")).andExpect(status().isOk());
        mvc.perform(post("/api/pedidos").header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON).content("""
            {"cliente":"Cliente prueba","direccion":"Calle de prueba 1","ciudad":"Trinidad",
             "departamento":"Casanare","barrio":"Centro","metodoPago":"Nequi","total":1,
             "detalles":[{"producto":"Camiseta piel durazno","cantidad":2,"precioUnitario":1}]}
            """))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.total").value(60000));
        mvc.perform(get("/api/pedidos/mis-pedidos").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].detalles[0].cantidad").value(2));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM detalle_pedido WHERE producto_id IS NOT NULL AND producto IS NOT NULL", Integer.class));
    }
}
