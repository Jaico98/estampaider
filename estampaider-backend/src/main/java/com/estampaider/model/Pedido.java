package com.estampaider.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "pedidos")
public class Pedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    @JsonIgnore
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "direccion_id")
    @JsonIgnore
    private DireccionEntrega direccionEntidad;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "metodo_pago_id")
    @JsonIgnore
    private MetodoPago metodoPagoEntidad;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "estado_id", nullable = false)
    @JsonIgnore
    private EstadoPedido estadoEntidad;

    @Column(name = "estado_pago", length = 40)
    private String estadoPago = "PENDIENTE";

    @Column(nullable = false)
    private LocalDateTime fecha;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total;

    @OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL, fetch = FetchType.EAGER, orphanRemoval = true)
    private List<DetallePedido> detalles = new ArrayList<>();

    @OneToMany(mappedBy = "pedido", fetch = FetchType.EAGER, cascade = CascadeType.ALL)
    private List<PedidoHistorial> historial = new ArrayList<>();

    /* Campos transitorios de compatibilidad con el contrato anterior. */
    @Transient private String cliente;
    @Transient private String telefono;
    @Transient private String estado;
    @Transient private String metodoPago;
    @Transient private String direccion;
    @Transient private String ciudad;
    @Transient private String departamento;
    @Transient private String barrio;
    @Transient private String referencia;

    @PrePersist
    public void prePersist() {
        if (fecha == null) fecha = LocalDateTime.now();
        if (estadoPago == null || estadoPago.isBlank()) estadoPago = "PENDIENTE";
        if (total == null) total = BigDecimal.ZERO;
    }

    public Long getId() { return id; }
    @JsonIgnore
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    @JsonIgnore
    public DireccionEntrega getDireccionEntidad() { return direccionEntidad; }
    public void setDireccionEntidad(DireccionEntrega value) { this.direccionEntidad = value; }
    @JsonIgnore
    public MetodoPago getMetodoPagoEntidad() { return metodoPagoEntidad; }
    public void setMetodoPagoEntidad(MetodoPago value) { this.metodoPagoEntidad = value; }
    @JsonIgnore
    public EstadoPedido getEstadoEntidad() { return estadoEntidad; }
    public void setEstadoEntidad(EstadoPedido value) { this.estadoEntidad = value; this.estado = value == null ? null : value.getNombre(); }

    public String getCliente() { return usuario != null ? usuario.getNombre() : cliente; }
    public void setCliente(String cliente) { this.cliente = cliente; }
    public String getTelefono() { return usuario != null ? usuario.getTelefono() : telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
    public String getEstado() { return estadoEntidad != null ? estadoEntidad.getNombre() : estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public String getMetodoPago() { return metodoPagoEntidad != null ? metodoPagoEntidad.getNombre() : metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }

    public String getDireccion() { return direccionEntidad != null ? direccionEntidad.getDireccion() : direccion; }
    public void setDireccion(String direccion) { this.direccion = direccion; }
    public String getCiudad() { return direccionEntidad != null ? direccionEntidad.getCiudad() : ciudad; }
    public void setCiudad(String ciudad) { this.ciudad = ciudad; }
    public String getDepartamento() { return direccionEntidad != null ? direccionEntidad.getDepartamento() : departamento; }
    public void setDepartamento(String departamento) { this.departamento = departamento; }
    public String getBarrio() { return direccionEntidad != null ? direccionEntidad.getBarrio() : barrio; }
    public void setBarrio(String barrio) { this.barrio = barrio; }
    public String getReferencia() { return direccionEntidad != null ? direccionEntidad.getReferencia() : referencia; }
    public void setReferencia(String referencia) { this.referencia = referencia; }

    public String getEstadoPago() { return estadoPago; }
    public void setEstadoPago(String estadoPago) { this.estadoPago = estadoPago; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }

    public double getTotal() { return total == null ? 0D : total.doubleValue(); }
    public void setTotal(double total) { this.total = BigDecimal.valueOf(total); }
    @JsonIgnore
    public BigDecimal getTotalDecimal() { return total; }
    public void setTotalDecimal(BigDecimal total) { this.total = total; }

    public List<DetallePedido> getDetalles() { return detalles; }
    public void setDetalles(List<DetallePedido> detalles) { this.detalles = detalles == null ? new ArrayList<>() : detalles; }
    public List<PedidoHistorial> getHistorial() { return historial; }
    public void setHistorial(List<PedidoHistorial> historial) { this.historial = historial == null ? new ArrayList<>() : historial; }
}
