const FacturaService = require('../services/facturaService');
const { generarResumenCompra } = require('../apis/openaiService');
const { enviarFacturaPorCorreo } = require('../services/emailService');
const { enviarWhatsApp, enviarSMS } = require('../services/notificacionService'); // ✅ Asegúrate de tener esto

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const facturaService = new FacturaService();

const facturaResolvers = {
  Mutation: {
    emitirFactura: async (_, { input }) => {
      try {
        const { legal_name, rfc, email, numero, productos } = input;

        if (!legal_name || !rfc || !email || !numero) {
          throw new Error('Faltan datos requeridos: legal_name, rfc, email o numero');
        }

        if (!productos || productos.length === 0) {
          throw new Error('Debe incluir al menos un producto');
        }

        productos.forEach((p, i) => {
          if (!p.nombre || !p.precio || !p.cantidad) {
            throw new Error(`Producto ${i + 1} incompleto`);
          }
        });

        const clienteInput = {
          legal_name,
          rfc,
          email,
          address: {
            zip: "00000",
            street: "Calle Principal",
            external: "123",
            internal: "",
            neighborhood: "Centro",
            city: "Ciudad",
            municipality: "Municipio",
            state: "Estado",
            country: "MEX"
          }
        };

        const productosParaServicio = productos.map(p => ({
          descripcion: p.nombre,
          precio: p.precio,
          cantidad: p.cantidad,
          claveProducto: "01010101",
          claveUnica: ""
        }));

        const factura = await facturaService.crearFactura({ clienteInput, productos: productosParaServicio });

        // PDF local
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const filePath = path.join(tempDir, `factura_${Date.now()}.pdf`);
        const doc = new PDFDocument();
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        doc.fontSize(20).text('FACTURA FISCAL', { align: 'center' }).moveDown();
        doc.fontSize(12).text(`Folio: ${factura.folio}`, { align: 'right' });
        doc.text(`Fecha: ${new Date(factura.fecha).toLocaleDateString('es-MX')}`, { align: 'right' }).moveDown();
        doc.text('DATOS DEL CLIENTE:', { underline: true });
        doc.text(`Razón Social: ${legal_name}`);
        doc.text(`RFC: ${rfc}`);
        doc.text(`Email: ${email}`).moveDown();
        doc.text('PRODUCTOS/SERVICIOS:', { underline: true }).moveDown();

        let y = doc.y;
        doc.text('Descripción', 50, y);
        doc.text('Precio', 300, y);
        doc.text('Cant.', 380, y);
        doc.text('Subtotal', 450, y);
        y += 20;
        doc.moveTo(50, y).lineTo(520, y).stroke();
        y += 10;

        productosParaServicio.forEach(p => {
          doc.text(p.descripcion, 50, y);
          doc.text(`$${p.precio.toFixed(2)}`, 300, y);
          doc.text(`${p.cantidad}`, 380, y);
          doc.text(`$${(p.precio * p.cantidad).toFixed(2)}`, 450, y);
          y += 20;
        });

        doc.moveTo(50, y).lineTo(520, y).stroke();
        y += 20;
        doc.fontSize(14).text(`TOTAL: $${factura.total.toFixed(2)}`, 400, y);
        doc.end();

        await new Promise((resolve, reject) => {
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });

        let resumen;
        try {
          resumen = await generarResumenCompra({
            nombre: legal_name,
            productos,
            total: factura.total
          });
        } catch {
          resumen = `Factura generada para ${legal_name}. Total: $${factura.total.toFixed(2)} MXN`;
        }

        try {
          await enviarFacturaPorCorreo({
            to: email,
            pdfPath: filePath,
            pdfUrl: factura.pdf_url,
            xmlUrl: factura.xml_url,
            subject: `Factura ${factura.folio} - ${legal_name}`,
            body: `Estimado ${legal_name}, adjunto encontrará su factura fiscal.`
          });
        } catch (err) {
          console.warn("No se pudo enviar el correo:", err.message);
        }

        // ✅ Enviar mensajes por WhatsApp y SMS
       // ✅ Generar resumen de productos para los mensajes
const resumenProductos = productos.map(p => `${p.cantidad} x ${p.nombre} ($${p.precio.toFixed(2)})`).join(', ');

const mensajeWhatsApp= `📦 ¡Hola ${legal_name}! Hemos generado tu factura por los siguientes productos: ${resumenProductos}. Total: $${factura.total.toFixed(2)} MXN. ¡Gracias por tu compra!`;

const mensajeSMS = `📢 ${legal_name}, compraste: ${resumenProductos}. Total: $${factura.total.toFixed(2)}.`;

        try {
          await enviarWhatsApp({ to: numero, body: mensajeWhatsApp });
          await enviarSMS({ to: numero, body: mensajeSMS });
          console.log('Mensajes enviados con éxito');
        } catch (e) {
          console.warn('No se pudieron enviar los mensajes:', e.message);
        }

        return {
          id: factura._id.toString(),
          cliente: { nombre: legal_name, rfc, email },
          productos: productos.map(p => ({
            nombre: p.nombre,
            precio: p.precio,
            cantidad: p.cantidad,
            subtotal: p.precio * p.cantidad
          })),
          total: factura.total,
          pdfUrl: factura.pdf_url,
          xmlUrl: factura.xml_url,
          folio: factura.folio,
          resumen
        };

      } catch (error) {
        console.error('Error completo al emitir factura:', error);
        throw new Error(`No se pudo emitir la factura: ${error.message}`);
      }
    }
  }
};

module.exports = facturaResolvers;
