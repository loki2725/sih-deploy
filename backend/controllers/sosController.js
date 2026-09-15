import { User } from "../models/User.js";
import { sendSosAlertEmail } from "../utils/sendEmail.js";

export const triggerSos = async (req, res, next) => {
  try {
    const patient = await User.findById(req.user.id).populate("linkedDoctor", "name email");
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    const triggeredAt = new Date();
    const recipients = [patient.email, patient.linkedDoctor?.email].filter(Boolean);

    const results = await Promise.allSettled(
      recipients.map((email) => sendSosAlertEmail(email, {
        patientName: patient.name,
        triggeredAt,
      })),
    );

    const sentTo = recipients.filter((_, index) => results[index].status === "fulfilled");
    const failed = recipients.filter((_, index) => results[index].status === "rejected");

    if (sentTo.length === 0) {
      return res.status(502).json({ error: "Couldn't send the SOS alert. Please try again." });
    }

    res.status(200).json({
      message: "SOS alert sent.",
      sentTo,
      failed,
      hasLinkedDoctor: !!patient.linkedDoctor,
    });
  } catch (error) {
    next(error);
  }
};
