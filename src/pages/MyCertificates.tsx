import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download } from "lucide-react";

const MyCertificates = () => {
  const [certificates, setCertificates] = useState<any[]>([]);
  const studentId = sessionStorage.getItem("studentId");

  useEffect(() => {
    const loadCertificates = async () => {
      try {
        if (!studentId) return;

        const q = query(
          collection(db, "eventRegistrations"),
          where("studentId", "==", studentId)
        );

        const snapshot = await getDocs(q);

        const data = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((item: any) => item.attendance === true);

        setCertificates(data);
      } catch (error) {
        console.error(error);
      }
    };

    loadCertificates();
  }, [studentId]);

  const downloadCertificate = async (id: string) => {
  const element = document.getElementById(`cert-${id}`);

  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 4,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const link = document.createElement("a");
  const cert = certificates.find(c => c.id === id);

const studentName =
  cert?.members?.[0]?.name?.replace(/\s+/g, "_") || "Student";

const eventName =
  cert?.eventTitle?.replace(/\s+/g, "_") || "Event";

link.download = `${eventName}_${studentName}_Certificate.png`;
  link.href = canvas.toDataURL("image/png", 1.0);
  link.click();
};

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">My Certificates</h1>

      {certificates.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <h2 className="text-xl font-semibold">
              No Certificates Available
            </h2>
            <p className="text-muted-foreground mt-2">
              Attend events to unlock certificates.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-12">
          {certificates.map((cert: any) => (
  <div key={cert.id}>

    <div
      id={`cert-${cert.id}`}
      className="relative mx-auto bg-white"
      style={{
        width: "1400px",
        maxWidth: "100%",
      }}
    >
      <img
        src="/certificate-template.jpg"
        alt="Certificate"
        style={{
          width: "100%",
          display: "block",
        }}
      />
                {/* Student Name */}
                <div
  className="absolute font-bold text-black"
  style={{
  top: "54.8%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  fontSize: "34px",
  fontWeight: "bold",
  width: "70%",
  textAlign: "center",
}}
>
  {cert.members?.[0]?.name || "Participant"}
</div>

                {/* Event Name */}
                <div
  className="absolute text-black font-semibold"
  style={{
    top: "61.8%",
    left: "68%",
    transform: "translate(-50%, -50%)",
    fontSize: "24px",
    width: "25%",
    textAlign: "center",
  }}
>
  {cert.eventTitle}
</div>
              </div>

              <div className="mt-4 flex justify-center">
                <Button
                  onClick={() => downloadCertificate(cert.id)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Certificate
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyCertificates;