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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            Registration Successful!
          </DialogTitle>
          <DialogDescription>
            Your digital ticket has been generated. Save it for event entry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Event Details */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">{event.title}</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{event.time}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-3 p-6 bg-muted/30 rounded-lg">
            <QRCode
              id="qr-code"
              value={qrData}
              size={200}
              level="H"
              bgColor="#ffffff"
              fgColor="#1e40af"
            />
            <div className="text-center">
              <p className="text-sm font-medium">Ticket Code</p>
              <p className="text-lg font-bold text-primary">{ticketCode}</p>
              <p className="text-xs text-muted-foreground mt-1">Student ID: {studentId}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button onClick={handleDownload} className="w-full" size="lg">
              <Download className="h-4 w-4 mr-2" />
              Download Ticket
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Present this QR code at the event entrance
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DigitalTicket;
