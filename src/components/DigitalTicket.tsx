import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Event } from '@/types/events';
import QRCode from 'react-qr-code';
import { Download, Calendar, MapPin, Clock, Ticket } from 'lucide-react';

interface DigitalTicketProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
  ticketCode: string;
  studentId: string;
}

const DigitalTicket = ({ open, onOpenChange, event, ticketCode, studentId }: DigitalTicketProps) => {
  if (!event) return null;

  const qrData = JSON.stringify({
    eventId: event.id,
    studentId,
    ticketCode,
    eventTitle: event.title,
  });

  const handleDownload = () => {
    const svg = document.getElementById('qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = `ticket-${ticketCode}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-[450px] p-0 border-0 bg-transparent shadow-none sm:rounded-3xl max-h-[calc(100vh-3rem)] overflow-hidden"
      >
        <div className="w-full rounded-3xl bg-white p-3 shadow-2xl sm:p-4">

          {/* Success */}
          <div className="mb-4 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-pink-100">
            <Ticket className="h-6 w-6 text-pink-600" />
          </div>
          <h2 className="text-xl font-bold">Registration Successful!</h2>
          <p className="mt-2 text-sm text-slate-500">Your digital ticket has been generated.</p>
        </div>

        {/* Ticket Card */}

        <div className="rounded-3xl border bg-gradient-to-br from-pink-50 via-white to-indigo-50 p-4 shadow-xl">

          <h3 className="text-2xl font-bold text-pink-700">
            {event.title}
          </h3>

          <div className="mt-4 grid gap-3 md:grid-cols-3">

            <div className="flex items-center gap-2">

              <Calendar className="h-5 w-5 text-pink-600" />

              <span>
                {new Date(event.date).toLocaleDateString()}
              </span>

            </div>

            <div className="flex items-center gap-2">

              <Clock className="h-5 w-5 text-pink-600" />

              <span>{event.time}</span>

            </div>

            <div className="flex items-center gap-2">

              <MapPin className="h-5 w-5 text-pink-600" />

              <span>{event.location}</span>

            </div>

          </div>

          {/* QR */}

          <div className="mt-6 rounded-3xl bg-white p-4 shadow-inner">
            <div className="flex justify-center">
              <QRCode
                id="qr-code"
                value={qrData}
                size={180}
                level="H"
                bgColor="#ffffff"
                fgColor="#1d4ed8"
              />
            </div>

            <div className="mt-6 text-center">

              <p className="text-xs uppercase tracking-widest text-slate-500">
                Ticket Code
              </p>

              <p className="text-2xl font-bold text-pink-700">
                {ticketCode}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Student ID: {studentId}
              </p>

            </div>

          </div>

        </div>

        <Button
          onClick={handleDownload}
          className="mt-5 h-12 w-full rounded-2xl bg-gradient-to-r from-pink-600 to-indigo-600 text-sm font-semibold"
        >
          <Download className="mr-2 h-4 w-4" />
          Download Ticket
        </Button>

        <p className="mt-3 text-center text-sm text-slate-500">
          Present this QR code at the event entrance.
        </p>

      </div>

    </DialogContent>
  </Dialog>
);
};

export default DigitalTicket;
