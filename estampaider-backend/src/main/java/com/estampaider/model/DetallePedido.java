package com.estampaider.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "detalle_pedido")
public class DetallePedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pedido_id", nullable = false)
    @JsonIgnore
    private Pedido pedido;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "producto_id", nullable = false)
    @JsonIgnore
    private Producto productoEntidad;

    @Column(name = "producto_nombre", nullable = false, length = 120)
    private String productoNombre;

    @Column(name = "precio_unitario", nullable = false, precision = 12, scale = 2)
    private BigDecimal precioUnitario;

    @Column(nullable = false)
    private int cantidad;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "talla_id")
    @JsonIgnore
    private Talla tallaEntidad;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "color_id")
    @JsonIgnore
    private Color colorEntidad;

    /* Columnas heredadas conservadas durante la transición al esquema 3FN. */
    @Column(name = "producto", nullable = false)
    private String producto;

    @Column(name = "talla")
    private String talla;

    @Column(name = "color")
    private String color;

    public Long getId() { return id; }
    public Pedido getPedido() { return pedido; }
    public void setPedido(Pedido pedido) { this.pedido = pedido; }
    @JsonIgnore
    public Producto getProductoEntidad() { return productoEntidad; }
    public void setProductoEntidad(Producto productoEntidad) {
        this.productoEntidad = productoEntidad;
        if (productoEntidad != null) {
            this.producto = productoEntidad.getNombre();
        }
    }

    public String getProducto() {
        return productoEntidad != null ? productoEntidad.getNombre() : producto;
    }

    public void setProducto(String producto) { this.producto = producto; }
    public String getProductoNombre() { return productoNombre != null ? productoNombre : getProducto(); }
    public void setProductoNombre(String productoNombre) { this.productoNombre = productoNombre; }

    public double getPrecioUnitario() {
        return precioUnitario == null ? 0D : precioUnitario.doubleValue();
    }

    public void setPrecioUnitario(double precioUnitario) {
        this.precioUnitario = BigDecimal.valueOf(precioUnitario);
    }

    @JsonIgnore
    public BigDecimal getPrecioUnitarioDecimal() { return precioUnitario; }
    public void setPrecioUnitarioDecimal(BigDecimal value) { this.precioUnitario = value; }
    public int getCantidad() { return cantidad; }
    public void setCantidad(int cantidad) { this.cantidad = cantidad; }

    @JsonIgnore
    public Talla getTallaEntidad() { return tallaEntidad; }
    public void setTallaEntidad(Talla tallaEntidad) {
        this.tallaEntidad = tallaEntidad;
        this.talla = tallaEntidad == null ? null : tallaEntidad.getNombre();
    }

    @JsonIgnore
    public Color getColorEntidad() { return colorEntidad; }
    public void setColorEntidad(Color colorEntidad) {
        this.colorEntidad = colorEntidad;
        this.color = colorEntidad == null ? null : colorEntidad.getNombre();
    }

    public String getTalla() { return tallaEntidad != null ? tallaEntidad.getNombre() : talla; }
    public void setTalla(String talla) { this.talla = talla; }
    public String getColor() { return colorEntidad != null ? colorEntidad.getNombre() : color; }
    public void setColor(String color) { this.color = color; }

    public double getSubtotal() { return cantidad * getPrecioUnitario(); }
}
