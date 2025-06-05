const sgMail = require('@sendgrid/mail');
const fs = require('fs');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function enviarFacturaPorCorreo({ to, pdfPath }) {
  const msg = {
    to,
    from: 'chalmunozor@ittepic.edu.mx', //correo verificado
    subject: 'Tu factura',
    text: 'Adjuntamos tu factura en PDF. ¡Gracias por tu compra!',
    attachments: [
      {
        content: fs.readFileSync(pdfPath).toString('base64'),
        filename: 'Factura.pdf',
        type: 'application/pdf',
        disposition: 'attachment'
      }
    ]
  };
  await sgMail.send(msg);
}

module.exports = { enviarFacturaPorCorreo };
