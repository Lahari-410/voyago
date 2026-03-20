import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import { IBooking } from '../models/Booking';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const generateTicketPDF = (booking: IBooking): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    // @ts-ignore — pdfkit types are slightly off, this works at runtime
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(28).fillColor('#1a73e8').text('VOYAGO', { align: 'center' });
    doc.fontSize(14).fillColor('#666').text('Journey Ticket', { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke('#ddd');
    doc.moveDown();

    doc.fontSize(16).fillColor('#000').text('Journey Details', { underline: true });
    doc.moveDown(0.5);

    const details: [string, string][] = [
      ['PNR', booking.pnr],
      ['Passenger', booking.passengerName],
      ['Type', booking.journeyType.toUpperCase()],
      ['From', booking.from],
      ['To', booking.to],
      ['Departure', new Date(booking.departureTime).toLocaleString('en-IN')],
      ['Arrival', new Date(booking.arrivalTime).toLocaleString('en-IN')],
      ['Seat', booking.seatNumber],
    ];

    if (booking.coachNumber) details.push(['Coach', booking.coachNumber]);
    if (booking.trainNumber) details.push(['Train No.', booking.trainNumber]);

    details.forEach(([label, value]) => {
      doc.fontSize(12).fillColor('#444').text(`${label}:  `, { continued: true });
      doc.fontSize(12).fillColor('#000').text(value);
    });

    doc.moveDown();
    doc.fontSize(11).fillColor('#888').text('Thank you for using Voyago.', { align: 'center' });
    doc.end();
  });
};

const sendTicketEmail = async (booking: IBooking, toEmail: string): Promise<void> => {
  const start = Date.now();
  const pdfBuffer = await generateTicketPDF(booking);

  await transporter.sendMail({
    from: `"Voyago" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Your Voyago Ticket — ${booking.from} to ${booking.to}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1a73e8">Booking Confirmed!</h2>
        <p>Hi ${booking.passengerName},</p>
        <p>Your ticket for <strong>${booking.from} → ${booking.to}</strong> is confirmed.</p>
        <p><strong>PNR:</strong> ${booking.pnr} &nbsp; <strong>Seat:</strong> ${booking.seatNumber}</p>
        <p>Your PDF ticket is attached.</p>
        <p style="color:#888;font-size:12px">— The Voyago Team</p>
      </div>
    `,
    attachments: [{
      filename: `voyago-ticket-${booking.pnr}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }],
  });

  console.log(`📧 Ticket email sent in ${Date.now() - start}ms`);
};

export default { sendTicketEmail };